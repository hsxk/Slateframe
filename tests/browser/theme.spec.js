const fs = require('node:fs/promises');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const photoPath = process.env.SLATEFRAME_PHOTO_PATH || pagePath;
const projectPath = process.env.SLATEFRAME_PROJECT_PATH || pagePath;
const knowledgePath = process.env.SLATEFRAME_KNOWLEDGE_PATH || pagePath;
const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || pagePath;

function projectWidth(testInfo) {
	return testInfo.project.use.viewport?.width || 1440;
}

function watchRuntime(page) {
	const failures = [];

	page.on('pageerror', (error) => {
		failures.push(`pageerror: ${error.message}`);
	});

	page.on('response', (response) => {
		const url = response.url();
		if (response.status() >= 400 && url.includes('/wp-content/themes/slateframe/')) {
			failures.push(`theme asset ${response.status()}: ${url}`);
		}
	});

	return failures;
}

async function expectNoHorizontalOverflow(page, route = page.url()) {
	const dimensions = await page.evaluate(() => {
		const clientWidth = document.documentElement.clientWidth;
		const offenders = [...document.querySelectorAll('body *')]
			.map((element) => {
				const rect = element.getBoundingClientRect();
				return {
					tag: element.tagName.toLowerCase(),
					className: typeof element.className === 'string' ? element.className : '',
					left: Math.round(rect.left * 10) / 10,
					right: Math.round(rect.right * 10) / 10,
					width: Math.round(rect.width * 10) / 10,
				};
			})
			.filter((item) => item.left < -1 || item.right > clientWidth + 1)
			.slice(0, 8);

		return {
			clientWidth,
			scrollWidth: document.documentElement.scrollWidth,
			offenders,
		};
	});

	expect(
		dimensions.scrollWidth,
		`${route}: scrollWidth ${dimensions.scrollWidth}px should not exceed clientWidth ${dimensions.clientWidth}px; offenders: ${JSON.stringify(dimensions.offenders)}`
	).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('core routes render without theme runtime failures', async ({ page }) => {
	const failures = watchRuntime(page);
	const routes = ['/', postPath, pagePath, photoPath, projectPath, knowledgePath, showcasePath, '/?s=Slateframe', '/slateframe-browser-missing/'];

	for (const route of routes) {
		failures.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		await expect(page.locator('#main-content')).toBeVisible();
		await expectNoHorizontalOverflow(page, route);
		expect(failures, `runtime failures on ${route}`).toEqual([]);
	}
});

test('skip link moves keyboard users to the main landmark', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.keyboard.press('Tab');

	const skipLink = page.locator('.skip-link');
	await expect(skipLink).toBeFocused();
	await expect(skipLink).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/#main-content$/);
});

test('responsive navigation remains operable', async ({ page }, testInfo) => {
	const failures = watchRuntime(page);
	await page.goto('/', { waitUntil: 'networkidle' });

	const toggle = page.locator('[data-menu-toggle]');

	if (projectWidth(testInfo) <= 900) {
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(page.locator('[data-primary-nav]')).not.toHaveAttribute('inert', '');

		const lastNavigationLink = page.locator('[data-primary-nav] a:visible').last();
		await lastNavigationLink.focus();
		await page.keyboard.press('Tab');
		await expect(toggle).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(toggle).toBeFocused();
		await expect(page.locator('[data-primary-nav]')).toHaveAttribute('inert', '');
	} else {
		await expect(toggle).toBeHidden();
		await expect(page.locator('[data-primary-nav]')).not.toHaveAttribute('inert', '');
	}

	await expectNoHorizontalOverflow(page, '/');
	expect(failures).toEqual([]);
});

test('spatial tokens keep interactive controls coherent and accessible', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	const tokens = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		return {
			control: Number.parseFloat(root.getPropertyValue('--slateframe-control')),
			gutter: Number.parseFloat(root.getPropertyValue('--slateframe-gutter-min')),
			radius: Number.parseFloat(root.getPropertyValue('--slateframe-radius')),
			spacing: Number.parseFloat(root.getPropertyValue('--slateframe-space-scale')),
			section: Number.parseFloat(root.getPropertyValue('--slateframe-section-scale')),
		};
	});
	expect(tokens.control).toBeGreaterThanOrEqual(44);
	expect(tokens.gutter).toBeGreaterThanOrEqual(12);
	expect(tokens.radius).toBeGreaterThanOrEqual(0);
	expect(tokens.spacing).toBeGreaterThanOrEqual(0.85);
	expect(tokens.section).toBeGreaterThanOrEqual(0.8);

	const targets = page.locator('.slateframe-primary-nav a:visible, [data-menu-toggle]:visible');
	for (let index = 0; index < await targets.count(); index += 1) {
		const box = await targets.nth(index).boundingBox();
		expect(box?.height || 0).toBeGreaterThanOrEqual(44);
	}
});

test('threaded comment replies load only on singular discussions', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	await expect(page.locator('#comment-reply-js')).toHaveCount(1);

	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(page.locator('#comment-reply-js')).toHaveCount(0);
});

test('comment controls stay inside singular reading canvases', async ({ page }) => {
	for (const route of [postPath, pagePath]) {
		await page.goto(route, { waitUntil: 'networkidle' });

		const textarea = page.locator('.slateframe-comments textarea').first();
		await expect(textarea).toBeVisible();

		const bounds = await textarea.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return {
				left: rect.left,
				right: rect.right,
				viewport: document.documentElement.clientWidth,
			};
		});

		expect(bounds.left).toBeGreaterThanOrEqual(-1);
		expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
		await expectNoHorizontalOverflow(page, route);
	}
});

test('publishing primitives remain readable and contained', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	await expect(page.locator('.browser-data-table')).toBeVisible();
	await expect(page.locator('.browser-lead')).toBeVisible();
	await expect(page.locator('.browser-toc')).toBeVisible();
	await expect(page.locator('.browser-details summary')).toBeVisible();
	await expect(page.locator('.browser-footnotes')).toBeVisible();
	await expect(page.locator('.slateframe-comments')).toBeVisible();

	const titleBounds = await page.locator('.slateframe-entry-title').evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return {
			left: rect.left,
			right: rect.right,
			viewport: document.documentElement.clientWidth,
		};
	});

	expect(titleBounds.left).toBeGreaterThanOrEqual(-1);
	expect(titleBounds.right).toBeLessThanOrEqual(titleBounds.viewport + 1);
	const fullChildBounds = await page.locator('.browser-full-block > p').evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return {
			left: rect.left,
			right: rect.right,
			viewport: document.documentElement.clientWidth,
		};
	});
	expect(fullChildBounds.left).toBeGreaterThanOrEqual(12);
	expect(fullChildBounds.right).toBeLessThanOrEqual(fullChildBounds.viewport - 12);

	await expectNoHorizontalOverflow(page, pagePath);
});

test('editorial reading rhythm distinguishes headings, nested lists, code, tables, and quotes', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const rhythm = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		const h2 = document.querySelector('.browser-reading-h2');
		const h3 = document.querySelector('.browser-reading-h3');
		const nested = document.querySelector('.browser-nested-list li > ul');
		const code = document.querySelector('.wp-block-code');
		const th = document.querySelector('.browser-data-table th');
		const h2Styles = getComputedStyle(h2);
		const codeStyles = getComputedStyle(code);
		const thStyles = getComputedStyle(th);
		return {
			proseGap: Number.parseFloat(root.getPropertyValue('--slateframe-prose-gap')),
			headingGap: Number.parseFloat(root.getPropertyValue('--slateframe-heading-gap')),
			headingAfter: Number.parseFloat(root.getPropertyValue('--slateframe-heading-after')),
			listGap: Number.parseFloat(root.getPropertyValue('--slateframe-list-item-gap')),
			stackGap: Number.parseFloat(root.getPropertyValue('--slateframe-stack-gap')),
			space3: Number.parseFloat(root.getPropertyValue('--slateframe-space-3')),
			h2Size: Number.parseFloat(h2Styles.fontSize),
			h3Size: Number.parseFloat(getComputedStyle(h3).fontSize),
			h2MarginStart: Number.parseFloat(h2Styles.marginBlockStart),
			h2MarginEnd: Number.parseFloat(h2Styles.marginBlockEnd),
			nestedGap: Number.parseFloat(getComputedStyle(nested).marginBlockStart),
			codeLineHeight: Number.parseFloat(codeStyles.lineHeight),
			codePaddingBlock: Number.parseFloat(codeStyles.paddingBlockStart),
			codePaddingInline: Number.parseFloat(codeStyles.paddingInlineStart),
			tableCellPadding: Number.parseFloat(thStyles.paddingBlockStart),
			tableHeadBackground: thStyles.backgroundColor,
		};
	});

	expect(rhythm.proseGap).toBeGreaterThan(0);
	expect(rhythm.headingGap).toBeGreaterThan(rhythm.proseGap);
	expect(rhythm.listGap).toBeGreaterThan(0);
	expect(rhythm.h2Size).toBeGreaterThan(rhythm.h3Size);
	expect(Math.abs(rhythm.h2MarginStart - rhythm.headingGap)).toBeLessThanOrEqual(1);
	expect(Math.abs(rhythm.h2MarginEnd - rhythm.headingAfter)).toBeLessThanOrEqual(1);
	expect(rhythm.nestedGap).toBeGreaterThanOrEqual(rhythm.listGap - 1);
	expect(rhythm.codeLineHeight).toBeGreaterThan(20);
	expect(Math.abs(rhythm.codePaddingBlock - rhythm.stackGap)).toBeLessThanOrEqual(1);
	expect(Math.abs(rhythm.codePaddingInline - rhythm.proseGap)).toBeLessThanOrEqual(1);
	expect(Math.abs(rhythm.tableCellPadding - rhythm.space3)).toBeLessThanOrEqual(1);
	expect(rhythm.tableHeadBackground).not.toBe('rgba(0, 0, 0, 0)');
	await expectNoHorizontalOverflow(page, pagePath);

	await page.goto(postPath, { waitUntil: 'networkidle' });
	await expect(page.locator('.browser-quote-source')).toBeVisible();
	const navigationTargets = page.locator('.slateframe-post-navigation a');
	for (let index = 0; index < await navigationTargets.count(); index += 1) {
		expect((await navigationTargets.nth(index).boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	}
});

test('reading helpers preserve print and navigation structure', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const lead = page.locator('.browser-lead');
	await expect(lead).toBeVisible();
	expect(await lead.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(16);
	await expect(page.locator('.browser-toc a')).toHaveCount(2);

	await page.emulateMedia({ media: 'print' });
	expect(await page.locator('.slateframe-site-header').evaluate((element) => getComputedStyle(element).display)).toBe('none');
	expect(await page.locator('.slateframe-comments').evaluate((element) => getComputedStyle(element).display)).toBe('none');
});

test('knowledge block styles remain contained and readable', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	for (const selector of ['.browser-steps', '.browser-checklist', '.browser-key-facts']) {
		await expect(page.locator(selector)).toBeVisible();
	}

	await expectNoHorizontalOverflow(page, pagePath);
});

test('fallback child navigation is available at every responsive width', async ({ page }, testInfo) => {
	await page.goto('/', { waitUntil: 'networkidle' });

	const nestedList = page.locator('[data-primary-nav] .children').first();
	await expect(nestedList).toHaveCount(1);

	if (projectWidth(testInfo) <= 900) {
		const toggle = page.locator('[data-menu-toggle]');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	} else {
		await page.locator('[data-primary-nav] .page_item_has_children > a').first().focus();
	}

	await expect(nestedList).toBeVisible();
	await expectNoHorizontalOverflow(page, '/');
});

test('reduced-motion preference disables smooth scrolling', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
	expect(scrollBehavior).toBe('auto');
});

test('comment thread remains on the prose reading axis', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const axes = await page.evaluate(() => {
		const heading = document.querySelector('.slateframe-comments-title');
		const list = document.querySelector('.slateframe-comment-list');

		if (!heading || !list) {
			throw new Error('Comment-axis fixtures are missing.');
		}

		return {
			headingLeft: heading.getBoundingClientRect().left,
			listLeft: list.getBoundingClientRect().left,
		};
	});

	expect(Math.abs(axes.headingLeft - axes.listLeft)).toBeLessThanOrEqual(1);
});

test('blockquote remains on the prose reading axis', async ({ page }) => {
	await page.goto(postPath, { waitUntil: 'networkidle' });

	const axes = await page.evaluate(() => {
		const paragraph = document.querySelector('.slateframe-prose > p');
		const quote = document.querySelector('.slateframe-prose > blockquote');

		if (!paragraph || !quote) {
			throw new Error('Reading-axis fixtures are missing.');
		}

		return {
			paragraphLeft: paragraph.getBoundingClientRect().left,
			quoteLeft: quote.getBoundingClientRect().left,
		};
	});

	expect(Math.abs(axes.paragraphLeft - axes.quoteLeft)).toBeLessThanOrEqual(1);
});

test('wide and full blocks can leave the prose measure', async ({ page }, testInfo) => {
	test.skip(projectWidth(testInfo) < 1000, 'Width comparison requires a desktop reading canvas.');

	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const widths = await page.evaluate(() => {
		const normal = document.querySelector('.browser-default-prose');
		const wide = document.querySelector('.browser-wide-block');
		const full = document.querySelector('.browser-full-block');

		if (!normal || !wide || !full) {
			throw new Error('Browser width fixtures are missing.');
		}

		return {
			normal: normal.getBoundingClientRect().width,
			wide: wide.getBoundingClientRect().width,
			full: full.getBoundingClientRect().width,
			viewport: document.documentElement.clientWidth,
		};
	});

	expect(widths.wide).toBeGreaterThan(widths.normal + 100);
	expect(widths.full).toBeGreaterThan(widths.wide + 100);
	expect(widths.full).toBeGreaterThan(widths.viewport * 0.95);
});

test('capture responsive reference screenshots', async ({ page }, testInfo) => {
	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });

	for (const [name, route] of [['page', pagePath], ['post', postPath]]) {
		await page.goto(route, { waitUntil: 'networkidle' });
		await page.screenshot({
			path: path.join(screenshotDir, `${testInfo.project.name}-${name}.png`),
			fullPage: true,
		});
	}
});


test('photography fixtures preserve natural image proportions and captions', async ({ page }) => {
	await page.goto(photoPath, { waitUntil: 'networkidle' });
	await expect(page.locator('.browser-photo-feature img')).toBeVisible();
	await expect(page.locator('.browser-photo-gallery figcaption')).toHaveCount(2);
	await expect(page.locator('.browser-photo-diptych img')).toHaveCount(2);
	const ratios = await page.evaluate(() => {
		const read = (selector) => {
			const image = document.querySelector(selector);
			const rect = image.getBoundingClientRect();
			return {
				ratio: rect.width / rect.height,
				height: rect.height,
				fit: getComputedStyle(image).objectFit,
			};
		};
		return {
			landscape: read('.browser-photo-gallery img[alt="Wide landscape fixture"]'),
			portrait: read('.browser-photo-gallery img[alt="Tall portrait fixture"]'),
			feature: read('.browser-photo-feature img'),
			viewportHeight: window.innerHeight,
		};
	});
	expect(ratios.landscape.ratio).toBeGreaterThan(1.5);
	expect(ratios.portrait.ratio).toBeLessThan(0.8);
	expect(ratios.landscape.fit).toBe('contain');
	expect(ratios.portrait.fit).toBe('contain');
	expect(ratios.feature.fit).toBe('contain');
	expect(ratios.portrait.height).toBeLessThanOrEqual((ratios.viewportHeight * 0.62) + 2);

	const captionPresentation = await page.locator('.browser-photo-gallery figcaption').first().evaluate((caption) => {
		const styles = getComputedStyle(caption);
		return {
			position: styles.position,
			backgroundImage: styles.backgroundImage,
			color: styles.color,
		};
	});
	expect(captionPresentation.position).toBe('static');
	expect(captionPresentation.backgroundImage).toBe('none');
	await expectNoHorizontalOverflow(page, photoPath);
});

test('photography diptych switches from one to two columns without cropping', async ({ page }, testInfo) => {
	await page.goto(photoPath, { waitUntil: 'networkidle' });

	const presentation = await page.locator('.browser-photo-diptych').evaluate((gallery) => {
		const styles = getComputedStyle(gallery);
		const images = [...gallery.querySelectorAll('img')];
		return {
			tracks: styles.gridTemplateColumns.split(' ').filter(Boolean).length,
			fits: images.map((image) => getComputedStyle(image).objectFit),
			heights: images.map((image) => image.getBoundingClientRect().height),
			viewportHeight: window.innerHeight,
		};
	});

	if (projectWidth(testInfo) <= 540) {
		expect(presentation.tracks).toBe(1);
	} else {
		expect(presentation.tracks).toBe(2);
	}

	expect(presentation.fits).toEqual(['contain', 'contain']);
	for (const height of presentation.heights) {
		expect(height).toBeLessThanOrEqual((presentation.viewportHeight * 0.62) + 2);
	}
	await expectNoHorizontalOverflow(page, photoPath);
});

test('portfolio brief keeps long references contained', async ({ page }) => {
	await page.goto(projectPath, { waitUntil: 'networkidle' });
	await expect(page.locator('.browser-project-brief')).toBeVisible();
	await expect(page.locator('.browser-project-brief a')).toBeVisible();
	await expect(page.locator('.browser-project-metrics .wp-block-column')).toHaveCount(3);
	await expectNoHorizontalOverflow(page, projectPath);
});

test('knowledge callouts respect RTL direction and logical layout', async ({ page }) => {
	await page.goto(knowledgePath, { waitUntil: 'networkidle' });
	const callout = page.locator('.browser-learning-callout');
	await expect(callout).toHaveAttribute('dir', 'rtl');
	expect(await callout.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
	await expect(page.locator('.browser-rtl-steps li')).toHaveCount(3);

	const definition = page.locator('.browser-definition');
	await expect(definition).toHaveAttribute('dir', 'rtl');
	const definitionBorders = await definition.evaluate((element) => {
		const styles = getComputedStyle(element);
		return {
			direction: styles.direction,
			inlineStart: Number.parseFloat(styles.borderInlineStartWidth),
			right: Number.parseFloat(styles.borderRightWidth),
			left: Number.parseFloat(styles.borderLeftWidth),
		};
	});
	expect(definitionBorders.direction).toBe('rtl');
	expect(definitionBorders.inlineStart).toBeGreaterThanOrEqual(3);
	expect(definitionBorders.right).toBeGreaterThan(definitionBorders.left);
	await expectNoHorizontalOverflow(page, knowledgePath);
});

test('capture WordPress.org screenshot candidate from the real showcase fixture', async ({ page }, testInfo) => {
	test.skip(projectWidth(testInfo) !== 1440, 'The release screenshot candidate is captured once.');

	await page.setViewportSize({ width: 1200, height: 900 });
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	await expect(page.locator('h1')).toHaveText('A clean frame for whatever you publish');
	await expect(page.locator('.slateframe-showcase-feature img')).toBeVisible();
	await expect(page.locator('.slateframe-showcase-grid .wp-block-column')).toHaveCount(3);
	await expectNoHorizontalOverflow(page, showcasePath);

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	await page.screenshot({
		path: path.join(screenshotDir, 'wordpress-org-screenshot-candidate.png'),
		fullPage: false,
	});
});

test('capture content-mode showcase screenshots', async ({ page }, testInfo) => {
	test.skip(![390, 1440].includes(projectWidth(testInfo)), 'Representative mobile and desktop screenshots only.');
	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	for (const [name, route] of [['photography', photoPath], ['portfolio', projectPath], ['knowledge', knowledgePath], ['showcase', showcasePath]]) {
		await page.goto(route, { waitUntil: 'networkidle' });
		await page.screenshot({ path: path.join(screenshotDir, `${testInfo.project.name}-${name}.png`), fullPage: true });
	}
});


test('reading stylesheet is requested only for singular documents', async ({ page }) => {
	const requests = [];
	page.on('request', (request) => {
		if (request.url().includes('/assets/css/reading.css')) {
			requests.push(request.url());
		}
	});

	for (const route of ['/', '/?s=Slateframe']) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `non-singular route should keep reading CSS unloaded: ${route}`).toHaveLength(0);
	}

	for (const route of [pagePath, postPath, photoPath, projectPath, knowledgePath, showcasePath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `singular route should load reading CSS: ${route}`).toHaveLength(1);
	}
});

test('content-mode stylesheet is requested only when specialized styles are present', async ({ page }) => {
	const requests = [];
	page.on('request', (request) => {
		if (request.url().includes('/assets/css/content-modes.css')) {
			requests.push(request.url());
		}
	});

	await page.goto(postPath, { waitUntil: 'networkidle' });
	expect(requests, 'ordinary post should keep the contextual stylesheet unloaded').toHaveLength(0);

	for (const route of [photoPath, projectPath, knowledgePath, showcasePath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `content-mode stylesheet should load on ${route}`).toHaveLength(1);
	}
});



test('portable showcase modes respond as a coherent editorial system', async ({ page }, testInfo) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });

	await expect(page.locator('.browser-sequence-gallery img')).toHaveCount(3);
	await expect(page.locator('.browser-sequence-gallery figcaption')).toHaveCount(3);
	await expect(page.locator('.browser-project-card')).toHaveCount(6);
	await expect(page.locator('.browser-learning-checkpoint > .wp-block-column')).toHaveCount(2);

	const layout = await page.evaluate(() => {
		const gallery = document.querySelector('.browser-sequence-gallery');
		const galleryItems = [...gallery.querySelectorAll(':scope > .wp-block-image')];
		const projectTemplate = document.querySelector('.browser-project-grid .wp-block-post-template');
		const firstProjectCard = projectTemplate.querySelector('.browser-project-card');
		const captions = [...gallery.querySelectorAll('figcaption')];

		return {
			galleryTracks: getComputedStyle(gallery).gridTemplateColumns.split(' ').filter(Boolean).length,
			projectTracks: getComputedStyle(projectTemplate).gridTemplateColumns.split(' ').filter(Boolean).length,
			projectWidth: projectTemplate.getBoundingClientRect().width,
			firstProjectCardWidth: firstProjectCard.getBoundingClientRect().width,
			firstWidth: galleryItems[0].getBoundingClientRect().width,
			secondWidth: galleryItems[1].getBoundingClientRect().width,
			captionPositions: captions.map((caption) => getComputedStyle(caption).position),
		};
	});

	if (projectWidth(testInfo) <= 640) {
		expect(layout.galleryTracks).toBe(1);
		expect(layout.projectTracks).toBe(1);
		expect(Math.abs(layout.firstWidth - layout.secondWidth)).toBeLessThanOrEqual(2);
	} else {
		expect(layout.galleryTracks).toBe(2);
		expect(layout.firstWidth).toBeGreaterThan(layout.secondWidth * 1.7);
		expect(layout.projectTracks).toBe(projectWidth(testInfo) <= 900 ? 2 : 3);
	}

	if (projectWidth(testInfo) >= 1440) {
		expect(layout.projectWidth).toBeGreaterThan(900);
	}

	expect(layout.firstProjectCardWidth).toBeGreaterThan(220);
	expect(layout.captionPositions).toEqual(['static', 'static', 'static']);
	await expect(page.locator('.browser-project-grid .wp-block-query-pagination')).toBeVisible();
	await expectNoHorizontalOverflow(page, showcasePath);
});


test('project decisions and knowledge procedures remain structured and contained', async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });

	await expect(page.locator('.browser-project-decision-steps li')).toHaveCount(3);
	await expect(page.locator('.browser-project-evidence')).toBeVisible();
	await expect(page.locator('.browser-knowledge-procedure-steps li')).toHaveCount(3);
	await expect(page.locator('.browser-knowledge-verification .is-style-slateframe-checklist li')).toHaveCount(2);
	await expect(page.locator('.browser-i18n-comparison > .wp-block-column')).toHaveCount(2);

	for (const selector of [
		'.browser-project-decision',
		'.browser-project-evidence',
		'.browser-knowledge-procedure',
		'.browser-knowledge-verification',
		'.browser-knowledge-comparison',
	]) {
		const bounds = await page.locator(selector).evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return { left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
		});
		expect(bounds.left, selector).toBeGreaterThanOrEqual(-1);
		expect(bounds.right, selector).toBeLessThanOrEqual(bounds.viewport + 1);
	}

	await expectNoHorizontalOverflow(page, showcasePath);
});

test('showcase media reserves intrinsic space to reduce layout-shift risk', async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });

	const dimensions = await page.locator('.browser-sequence-gallery img').evaluateAll((images) =>
		images.map((image) => ({
			width: Number(image.getAttribute('width')),
			height: Number(image.getAttribute('height')),
			clientWidth: image.getBoundingClientRect().width,
			clientHeight: image.getBoundingClientRect().height,
			fit: getComputedStyle(image).objectFit,
		}))
	);

	for (const image of dimensions) {
		expect(image.width).toBeGreaterThan(0);
		expect(image.height).toBeGreaterThan(0);
		expect(image.clientWidth).toBeGreaterThan(0);
		expect(image.clientHeight).toBeGreaterThan(0);
		expect(image.fit).toBe('contain');
	}

	await expectNoHorizontalOverflow(page, showcasePath);
});

test('post metadata never emits an unnamed author link', async ({ page }) => {
	for (const route of ['/', postPath]) {
		await page.goto(route, { waitUntil: 'networkidle' });
		const unnamed = await page.locator('.slateframe-entry-meta a').evaluateAll((links) =>
			links.filter((link) => {
				const text = (link.textContent || '').trim();
				const label = (link.getAttribute('aria-label') || '').trim();
				return !text && !label;
			}).length
		);
		expect(unnamed, `unnamed metadata links on ${route}`).toBe(0);
	}
});
