const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const emptyAuthorPath = process.env.SLATEFRAME_EMPTY_AUTHOR_PATH || '/?author=2';

async function expectNoRootOverflow(page) {
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(1);
}

test('single posts expose portable related reading without replacing post navigation', async ({ page }) => {
	await page.goto(postPath, { waitUntil: 'networkidle' });

	const related = page.locator('.slateframe-related');
	await expect(related).toBeVisible();
	await expect(related.getByRole('heading', { name: 'Related posts' })).toBeVisible();

	const links = related.locator('.slateframe-related-item a');
	expect(await links.count()).toBeGreaterThan(0);
	expect(await links.count()).toBeLessThanOrEqual(3);
	for (let index = 0; index < await links.count(); index += 1) {
		expect((await links.nth(index).boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	}

	await expect(page.locator('.slateframe-post-navigation')).toBeVisible();
	await expectNoRootOverflow(page);
});

test('404 keeps recovery actions keyboard reachable and content discovery contained', async ({ page }) => {
	await page.goto('/slateframe-browser-missing-route/', { waitUntil: 'networkidle' });

	await expect(page.locator('body')).toHaveClass(/error404/);
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
	await expect(page.locator('.slateframe-search-form input[type="search"]')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();

	const action = page.locator('.slateframe-action-link');
	expect((await action.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);

	const recent = page.locator('.slateframe-not-found-recent');
	if (await recent.count()) {
		expect(await recent.locator('.slateframe-related-item a').count()).toBeLessThanOrEqual(3);
	}

	await expectNoRootOverflow(page);
});

test('author metadata keeps the WordPress archive as the safe default', async ({ page }) => {
	await page.goto(postPath, { waitUntil: 'networkidle' });
	const byline = page.locator('.slateframe-byline a');
	await expect(byline).toBeVisible();
	expect(await byline.getAttribute('href')).toMatch(/(?:\/author\/|[?&]author=\d+)/);
});

test('author archives expose a native avatar surface without fixed media URLs', async ({ page }) => {
	await page.goto('/?author=1', { waitUntil: 'networkidle' });

	await expect(page.locator('body')).toHaveClass(/author/);
	await expect(page.locator('.slateframe-author-header')).toBeVisible();
	const avatar = page.locator('.slateframe-author-avatar');
	await expect(avatar).toBeVisible();
	await expect(avatar.locator('.browser-author-avatar-source')).toBeVisible();
	expect((await avatar.boundingBox())?.width || 0).toBeGreaterThanOrEqual(64);
	await expectNoRootOverflow(page);
});

test('common TOC controls inherit Slateframe touch sizing without plugin ownership', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const toc = page.locator('.slateframe-prose').first();
	await toc.evaluate((node) => {
		const fixture = document.createElement('nav');
		fixture.className = 'ez-toc-container';
		fixture.innerHTML = '<div class="ez-toc-title-container"><button class="ez-toc-toggle" type="button">Contents</button></div><ol><li><a href="#main-content">Overview</a></li></ol>';
		node.prepend(fixture);
	});

	const toggle = page.locator('.ez-toc-toggle');
	await expect(toggle).toBeVisible();
	expect((await toggle.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	await expectNoRootOverflow(page);
});

test('entry metadata links keep the shared touch-target baseline', async ({ page }) => {
	await page.goto(postPath, { waitUntil: 'networkidle' });
	const links = page.locator('.slateframe-entry-meta a');
	expect(await links.count()).toBeGreaterThan(0);
	for (let index = 0; index < await links.count(); index += 1) {
		expect((await links.nth(index).boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	}
});

test('language adapter remains reachable through responsive navigation', async ({ page }, testInfo) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	const width = testInfo.project.use.viewport?.width || 1440;
	const switcher = page.locator('.browser-language-switcher');
	const compact = await page.locator('[data-site-header]').evaluate((node) => node.classList.contains('is-compact'));
	if (width <= 1280) {
		expect(compact).toBe(true);
	}
	if (compact) {
		await page.locator('[data-menu-toggle]').click();
	}
	await expect(switcher).toBeVisible();
	const links = switcher.locator('a');
	await expect(links).toHaveCount(2);
	for (let index = 0; index < await links.count(); index += 1) {
		expect((await links.nth(index).boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	}
	await expectNoRootOverflow(page);
});

test('native footer content uses the shared responsive control and spatial system', async ({ page }, testInfo) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	const region = page.locator('.slateframe-site-footer .slateframe-footer-content');
	const content = region.locator('.browser-footer-content');
	const link = region.locator('.browser-footer-link');
	await expect(region).toBeVisible();
	await expect(content).toBeVisible();
	await expect(link).toBeVisible();
	expect((await link.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	const metrics = await page.evaluate(() => {
		const region = document.querySelector('.slateframe-footer-content');
		const inner = document.querySelector('.slateframe-footer-inner');
		const link = document.querySelector('.browser-footer-link');
		if (!region || !inner || !link) throw new Error('Footer fixture is incomplete.');
		const linkRect = link.getBoundingClientRect();
		const container = inner.getBoundingClientRect();
		const styles = getComputedStyle(inner);
		const gap = parseFloat(styles.columnGap) || 0;
		const minimumTrack = Math.min(container.width, 15 * parseFloat(getComputedStyle(document.documentElement).fontSize));
		const children = [...inner.children].filter((item) => getComputedStyle(item).display !== 'none');
		const rectangles = children.map((item) => {
			const rect = item.getBoundingClientRect();
			return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
		});
		const occupiedColumns = new Set(rectangles.map((rect) => Math.round(rect.left))).size;
		const capacity = Math.max(1, Math.floor((container.width + gap + 0.5) / (minimumTrack + gap)));
		return {
			regionDisplay: getComputedStyle(region).display,
			innerDisplay: styles.display,
			minimumTrack,
			childCount: children.length,
			occupiedColumns,
			capacity,
			rectangles,
			linkLeft: linkRect.left,
			linkRight: linkRect.right,
			linkWidth: linkRect.width,
			viewport: document.documentElement.clientWidth,
		};
	});
	expect(metrics.regionDisplay).toBe('grid');
	expect(metrics.innerDisplay).toBe('grid');
	// CSS auto-fit may serialize empty tracks. Check occupied tracks and their geometry.
	const width = testInfo.project.use.viewport?.width || 1440;
	const expectedColumns = width <= 640 ? 1 : Math.min(metrics.childCount, metrics.capacity);
	expect(metrics.occupiedColumns, JSON.stringify(metrics)).toBe(expectedColumns);
	for (const rect of metrics.rectangles) {
		expect(rect.width, 'Footer item must preserve its intrinsic track minimum').toBeGreaterThanOrEqual(metrics.minimumTrack - 1);
		expect(rect.left, 'Footer item must remain inside viewport').toBeGreaterThanOrEqual(-1);
		expect(rect.right, 'Footer item must remain inside viewport').toBeLessThanOrEqual(metrics.viewport + 1);
	}
	for (let i = 0; i < metrics.rectangles.length; i += 1) {
		for (let j = i + 1; j < metrics.rectangles.length; j += 1) {
			const a = metrics.rectangles[i];
			const b = metrics.rectangles[j];
			const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
			const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
			expect(overlapWidth <= 1 || overlapHeight <= 1, 'Footer items must never overlap').toBe(true);
		}
	}
	expect(metrics.linkWidth).toBeGreaterThanOrEqual(44);
	expect(metrics.linkLeft).toBeGreaterThanOrEqual(-1);
	expect(metrics.linkRight).toBeLessThanOrEqual(metrics.viewport + 1);
	await expectNoRootOverflow(page);
});

test('global shell styles load exactly once across ordinary and specialized routes', async ({ page }) => {
	const requests = { navigation: [], footer: [] };
	page.on('request', (request) => {
		if (request.url().includes('/assets/css/navigation.css')) requests.navigation.push(request.url());
		if (request.url().includes('/assets/css/footer.css')) requests.footer.push(request.url());
	});
	for (const route of ['/', pagePath, postPath]) {
		requests.navigation.length = 0;
		requests.footer.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests.navigation, `navigation shell asset on ${route}`).toHaveLength(1);
		expect(requests.footer, `footer shell asset on ${route}`).toHaveLength(1);
	}
});

test('common TOC links keep the shared touch-target baseline', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const prose = page.locator('.slateframe-prose').first();
	await prose.evaluate((node) => {
		const fixture = document.createElement('nav');
		fixture.className = 'ez-toc-container';
		fixture.innerHTML = '<div class="ez-toc-title-container"><button class="ez-toc-toggle" type="button">Contents</button></div><ol><li><a class="ez-toc-link" href="#main-content">Overview</a></li></ol>';
		node.prepend(fixture);
	});
	const link = page.locator('.ez-toc-link');
	await expect(link).toBeVisible();
	expect((await link.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
});


test('empty discovery states remain actionable without empty pagination chrome', async ({ page }) => {
	const routes = [
		['search', '/?s=slateframe-empty-state-fixture-987654321'],
		['author', emptyAuthorPath],
	];

	for (const [kind, route] of routes) {
		await page.goto(route, { waitUntil: 'networkidle' });
		const state = page.locator('.slateframe-empty-state');
		await expect(state).toBeVisible();
		await expect(state.locator('h2')).toBeVisible();
		await expect(page.locator('.slateframe-pagination')).toHaveCount(0);

		if (kind === 'author') {
			const search = state.locator('.slateframe-search-form');
			await expect(search).toBeVisible();
			for (const control of [search.locator('input[type="search"]'), search.locator('button')]) {
				expect((await control.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
			}
		}

		await expectNoRootOverflow(page);
	}
});

test('empty-state presentation is contextual and captures mobile/desktop evidence', async ({ page }, testInfo) => {
	const viewport = testInfo.project.use.viewport?.width || 1440;
	test.skip(![390, 1440].includes(viewport), 'Empty-state visual evidence uses representative mobile and desktop widths.');

	const requests = [];
	page.on('request', (request) => {
		if (request.url().includes('/assets/css/empty-state.css')) requests.push(request.url());
	});

	await page.goto(pagePath, { waitUntil: 'networkidle' });
	expect(requests).toHaveLength(0);

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	for (const [kind, route] of [
		['search', '/?s=slateframe-empty-state-fixture-987654321'],
		['author', emptyAuthorPath],
	]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, kind).toHaveLength(1);
		await page.screenshot({
			path: path.join(screenshotDir, `empty-${kind}-${testInfo.project.name}.png`),
			fullPage: true,
		});
	}
});
