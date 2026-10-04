const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const editorPostId = process.env.SLATEFRAME_EDITOR_POST_ID;
const projectWidth = (testInfo) => testInfo.project.use.viewport?.width || 1440;

test.beforeEach(({}, testInfo) => {
	test.skip(!editorPostId, 'The WordPress browser fixture must expose an editor post.');
	test.skip(![390, 1440].includes(projectWidth(testInfo)), 'Gutenberg parity uses representative mobile and desktop widths.');
});

async function loginAndOpenEditor(page) {
	await page.goto('/wp-login.php', { waitUntil: 'domcontentloaded' });
	await page.locator('#user_login').fill('admin');
	await page.locator('#user_pass').fill('ci-password');
	await Promise.all([
		page.waitForURL(/\/wp-admin\//),
		page.locator('#wp-submit').click(),
	]);

	await page.goto(`/wp-admin/post.php?post=${editorPostId}&action=edit`, { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(() => {
		const select = window.wp?.data?.select?.('core/block-editor');
		return Boolean(select?.getBlocks?.().length);
	});

	const welcomeGuide = page.locator('[role="dialog"]').filter({ hasText: /Welcome to the editor/i }).first();
	try {
		await welcomeGuide.waitFor({ state: 'visible', timeout: 2_000 });
		const closeButton = welcomeGuide.getByRole('button', { name: /close/i }).first();
		await expect(closeButton).toBeVisible();
		await closeButton.click();
		await expect(welcomeGuide).toBeHidden();
	} catch (error) {
		if (await welcomeGuide.isVisible().catch(() => false)) throw error;
	}

	const frame = page.locator('iframe[name="editor-canvas"]');
	if (await frame.count()) {
		await expect(frame).toBeVisible();
		const canvas = page.frameLocator('iframe[name="editor-canvas"]');
		await expect(canvas.locator('.editor-styles-wrapper')).toBeVisible();
		return canvas;
	}

	await expect(page.locator('.editor-styles-wrapper')).toBeVisible();
	return page;
}

async function withFocusedEvidence(page, callback) {
	const chromeSuppression = await page.addStyleTag({
		content: [
			'#wpadminbar',
			'.interface-interface-skeleton__header',
			'.edit-post-header',
			'.editor-header',
			'.components-snackbar-list',
		].join(',') + ' { visibility: hidden !important; pointer-events: none !important; }',
	});
	await chromeSuppression.evaluate((node) => {
		node.dataset.slateframeEvidence = 'focused';
	});

	try {
		await callback();
	} finally {
		await chromeSuppression.evaluate((node) => node.remove()).catch(() => {});
	}

	expect(await page.locator('style[data-slateframe-evidence="focused"]').count()).toBe(0);
}

test('real Gutenberg canvas keeps Slateframe patterns valid, readable, and contained', async ({ page }, testInfo) => {
	const canvas = await loginAndOpenEditor(page);

	const invalidBlocks = await page.evaluate(() => {
		const walk = (blocks) => blocks.flatMap((block) => [block, ...walk(block.innerBlocks || [])]);
		const blocks = window.wp.data.select('core/block-editor').getBlocks();
		return walk(blocks)
			.filter((block) => block.isValid === false)
			.map((block) => block.name);
	});
	expect(invalidBlocks).toEqual([]);

	for (const selector of [
		'.slateframe-editorial-opening',
		'.slateframe-photography-diptych',
		'.slateframe-project-grid',
		'.slateframe-knowledge-procedure',
	]) {
		await expect(canvas.locator(selector).first()).toBeVisible();
	}

	const photographyMedia = canvas.locator('.browser-editor-photography-gallery').first();
	await expect(photographyMedia).toBeVisible();
	await expect(photographyMedia.locator('img')).toHaveCount(2);
	await expect(photographyMedia.locator('figcaption')).toHaveCount(2);

	const photographyGeometry = await photographyMedia.evaluate((gallery) => {
		const images = [...gallery.querySelectorAll('img')];
		const captions = [...gallery.querySelectorAll('figcaption')];
		return {
			tracks: getComputedStyle(gallery).gridTemplateColumns.split(' ').filter(Boolean).length,
			rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			images: images.map((image) => {
				const box = image.getBoundingClientRect();
				return {
					width: box.width,
					height: box.height,
					naturalWidth: image.naturalWidth,
					naturalHeight: image.naturalHeight,
					objectFit: getComputedStyle(image).objectFit,
				};
			}),
			captions: captions.map((caption) => ({
				position: getComputedStyle(caption).position,
				wrap: getComputedStyle(caption).overflowWrap,
			})),
		};
	});
	expect(photographyGeometry.images[0].naturalWidth).toBeGreaterThan(photographyGeometry.images[0].naturalHeight);
	expect(photographyGeometry.images[1].naturalHeight).toBeGreaterThan(photographyGeometry.images[1].naturalWidth);
	for (const image of photographyGeometry.images) {
		expect(image.width).toBeGreaterThan(0);
		expect(image.height).toBeGreaterThan(0);
		expect(['contain', 'fill']).toContain(image.objectFit);
	}
	expect(photographyGeometry.captions).toEqual([
		{ position: 'static', wrap: 'anywhere' },
		{ position: 'static', wrap: 'anywhere' },
	]);
	expect(photographyGeometry.rootOverflow).toBeLessThanOrEqual(1);
	expect(photographyGeometry.tracks).toBe(projectWidth(testInfo) === 390 ? 1 : 2);

	const portfolioEvidence = canvas.locator('.browser-project-grid').first();
	await expect(portfolioEvidence).toBeVisible();
	await expect(portfolioEvidence.locator('.slateframe-project-card')).toHaveCount(6);
	await expect(portfolioEvidence).toContainText('可迁移的项目案例');
	await expect(portfolioEvidence).not.toContainText('Hello world!');

	const root = canvas.locator('.editor-styles-wrapper').first();
	const title = canvas.locator('.wp-block-post-title').first();
	await expect(title).toBeVisible();

	const containment = await root.evaluate((node) => ({
		clientWidth: node.clientWidth,
		scrollWidth: node.scrollWidth,
		content: getComputedStyle(node).getPropertyValue('--slateframe-content').trim(),
		wide: getComputedStyle(node).getPropertyValue('--slateframe-wide').trim(),
	}));
	expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth + 1);
	expect(containment.content).not.toBe('');
	expect(containment.wide).not.toBe('');

	const titleMetrics = await title.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		const styles = getComputedStyle(node);
		return {
			right: rect.right,
			viewport: document.documentElement.clientWidth,
			maxWidth: styles.maxWidth,
			whiteSpace: styles.whiteSpace,
		};
	});
	expect(titleMetrics.right).toBeLessThanOrEqual(titleMetrics.viewport + 1);
	expect(titleMetrics.whiteSpace).not.toBe('nowrap');
	if (projectWidth(testInfo) === 1440) expect(titleMetrics.maxWidth).not.toBe('none');

	const details = canvas.locator('.wp-block-details').first();
	await expect(details).toBeVisible();
	const summary = details.locator('summary');
	await expect(summary).toBeVisible();
	expect((await summary.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);

	const code = canvas.locator('.wp-block-code').first();
	await expect(code).toBeVisible();
	const codeStyle = await code.evaluate((node) => {
		const styles = getComputedStyle(node);
		return {
			overflowX: styles.overflowX,
			background: styles.backgroundColor,
			fontFamily: styles.fontFamily,
		};
	});
	expect(codeStyle.overflowX).toBe('auto');
	expect(codeStyle.background).not.toBe('rgba(0, 0, 0, 0)');
	expect(codeStyle.fontFamily.toLowerCase()).toMatch(/mono|consolas|liberation/);

	const table = canvas.locator('.wp-block-table').first();
	await expect(table).toBeVisible();
	const tableMetrics = await table.evaluate((node) => ({
		clientWidth: node.clientWidth,
		scrollWidth: node.scrollWidth,
		rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
	}));
	expect(tableMetrics.scrollWidth).toBeGreaterThanOrEqual(tableMetrics.clientWidth);
	expect(tableMetrics.rootOverflow).toBeLessThanOrEqual(1);

	const pullquote = canvas.locator('.wp-block-pullquote').first();
	await expect(pullquote).toBeVisible();
	const pullquoteStyle = await pullquote.evaluate((node) => {
		const styles = getComputedStyle(node);
		return { borderTopWidth: Number.parseFloat(styles.borderTopWidth), textAlign: styles.textAlign };
	});
	expect(pullquoteStyle.borderTopWidth).toBeGreaterThanOrEqual(1);
	expect(['start', 'left']).toContain(pullquoteStyle.textAlign);

	const knowledge = canvas.locator('.slateframe-knowledge-procedure').first();
	await knowledge.evaluate((node) => {
		node.dir = 'rtl';
		const paragraph = node.querySelector('p');
		if (paragraph) paragraph.textContent = 'العربية 中文 日本語 — a deliberately long multilingual authoring sentence that must wrap inside the Gutenberg canvas without widening it';
	});
	const rtlMetrics = await knowledge.evaluate((node) => ({
		direction: getComputedStyle(node).direction,
		rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
	}));
	expect(rtlMetrics.direction).toBe('rtl');
	expect(rtlMetrics.rootOverflow).toBeLessThanOrEqual(1);

	await expect(page.locator('[role="dialog"]').filter({ hasText: /Welcome to the editor/i })).toBeHidden();

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });

	await title.scrollIntoViewIfNeeded();
	await page.screenshot({
		path: path.join(screenshotDir, `gutenberg-${testInfo.project.name}-top.png`),
		fullPage: false,
	});

	const evidence = [
		['editorial', canvas.locator('.slateframe-editorial-opening').first()],
		['reading-table', table],
		['reading-code', code],
		['reading-disclosure', details],
		['reading-footnotes', canvas.locator('.browser-footnotes').first()],
		['reading-pullquote', pullquote],
		['photography-starter', canvas.locator('.slateframe-photography-diptych').first()],
		['photography-media', photographyMedia],
		['portfolio', portfolioEvidence],
		['knowledge', canvas.locator('.slateframe-knowledge-procedure').first()],
	];

	await withFocusedEvidence(page, async () => {
		for (const [name, region] of evidence) {
			await region.scrollIntoViewIfNeeded();
			await expect(region).toBeVisible();

			const box = await region.boundingBox();
			expect(box?.width || 0).toBeGreaterThan(0);
			expect(box?.height || 0).toBeGreaterThan(0);

			await region.screenshot({
				path: path.join(screenshotDir, `gutenberg-${testInfo.project.name}-${name}.png`),
			});
		}
	});

	await expect(page.locator('.interface-interface-skeleton__header, .editor-header').first()).toBeVisible();
});
