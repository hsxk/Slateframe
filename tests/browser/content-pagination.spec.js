const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const postPath = process.env.SLATEFRAME_MULTIPAGE_POST_PATH;
const pagePath = process.env.SLATEFRAME_MULTIPAGE_PAGE_PATH;
const viewport = (testInfo) => testInfo.project.use.viewport?.width || 1440;

async function verifyPages(page, route, count, firstMarker, nextMarker, testInfo) {
	await page.goto(route, { waitUntil: 'networkidle' });
	const nav = page.getByRole('navigation', { name: 'Content pages' });
	await expect(nav).toBeVisible();
	await expect(nav.locator('.post-page-numbers')).toHaveCount(count);
	await expect(nav.locator('[aria-current="page"]')).toHaveText('1');
	await expect(page.locator(firstMarker)).toBeVisible();
	await expect(page.locator(nextMarker)).toHaveCount(0);
	const second = nav.getByRole('link', { name: '2' });
	const target = await second.boundingBox();
	expect(target?.width || 0).toBeGreaterThanOrEqual(44);
	expect(target?.height || 0).toBeGreaterThanOrEqual(44);
	await second.click();
	await expect(page.locator(nextMarker)).toBeVisible();
	await expect(page.locator(firstMarker)).toHaveCount(0);
	await expect(page.getByRole('navigation', { name: 'Content pages' }).locator('[aria-current="page"]')).toHaveText('2');
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(1);
	if ([390, 1440].includes(viewport(testInfo))) {
		const dir = path.resolve('test-artifacts/screenshots');
		await fs.mkdir(dir, { recursive: true });
		await page.screenshot({ path: path.join(dir, `content-pagination-${route.includes('page_id') ? 'page' : 'post'}-${testInfo.project.name}.png`), fullPage: true });
	}
}

test('native post page breaks preserve article context, current page and touch targets', async ({ page }, testInfo) => {
	test.skip(!postPath, 'WordPress multipage post fixture is required.');
	await verifyPages(page, postPath, 3, '.browser-chapter-one', '.browser-chapter-two', testInfo);
	await expect(page.locator('.browser-chapter-two')).toHaveAttribute('dir', 'rtl');
	await page.locator('html').evaluate((node) => { node.style.fontSize = '200%'; });
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(1);
});

test('native page breaks work in ordinary WordPress Pages without a custom content model', async ({ page }, testInfo) => {
	test.skip(!pagePath, 'WordPress multipage Page fixture is required.');
	await verifyPages(page, pagePath, 2, '.browser-page-one', '.browser-page-two', testInfo);
});
