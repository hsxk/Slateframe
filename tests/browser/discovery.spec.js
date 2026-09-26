const { test, expect } = require('@playwright/test');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';

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
