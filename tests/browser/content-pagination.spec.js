const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const postPath = process.env.SLATEFRAME_MULTIPAGE_POST_PATH;
const pagePath = process.env.SLATEFRAME_MULTIPAGE_PAGE_PATH;
const viewport = (testInfo) => testInfo.project.use.viewport?.width || 1440;

async function measureOverflow(page) {
	return page.evaluate(() => {
		const viewport = document.documentElement.clientWidth;
		const offenders = [...document.body.querySelectorAll('*')].map((element) => {
			const rect = element.getBoundingClientRect();
			return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', left: Math.round(rect.left), right: Math.round(rect.right) };
		}).filter((item) => item.left < -1 || item.right > viewport + 1).slice(0, 12);
		return { viewport, overflow: document.documentElement.scrollWidth - viewport, offenders };
	});
}

async function expectSettledLayout(page, label) {
	await page.waitForLoadState('networkidle');
	await page.evaluate(async () => {
		await document.fonts.ready;
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	});
	const metrics = await measureOverflow(page);
	expect(metrics.overflow, `${label}: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(1);
}

async function verifyPages(page, route, count, firstMarker, nextMarker, testInfo) {
	await page.goto(route, { waitUntil: 'networkidle' });
	const nav = page.getByRole('navigation', { name: 'Content pages' });
	await expect(nav).toBeVisible();
	await expect(nav.locator('.post-page-numbers')).toHaveCount(count);
	await expect(nav.locator('[aria-current="page"]')).toHaveText('1');
	await expect(page.locator(firstMarker)).toBeVisible();
	await expect(page.locator(nextMarker)).toHaveCount(0);
	for (const target of await nav.locator('.post-page-numbers').all()) {
		const box = await target.boundingBox();
		expect(box?.width || 0).toBeGreaterThanOrEqual(44);
		expect(box?.height || 0).toBeGreaterThanOrEqual(44);
	}
	const second = nav.getByRole('link', { name: '2' });
	const target = await second.boundingBox();
	expect(target?.width || 0).toBeGreaterThanOrEqual(44);
	expect(target?.height || 0).toBeGreaterThanOrEqual(44);
	await second.click();
	await expect(page.locator(nextMarker)).toBeVisible();
	await expect(page.locator(firstMarker)).toHaveCount(0);
	await expect(page.getByRole('navigation', { name: 'Content pages' }).locator('[aria-current="page"]')).toHaveText('2');
	await expectSettledLayout(page, `native pagination ${route}`);
	if ([320, 390, 1440].includes(viewport(testInfo))) {
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
	await expectSettledLayout(page, '200% text sizing on multipage post');
	if ([320, 390, 1440].includes(viewport(testInfo))) {
		const dir = path.resolve('test-artifacts/screenshots');
		await fs.mkdir(dir, { recursive: true });
		await page.screenshot({ path: path.join(dir, `content-pagination-zoom-${testInfo.project.name}.png`), fullPage: true });
	}
});

test('native page breaks work in ordinary WordPress Pages without a custom content model', async ({ page }, testInfo) => {
	test.skip(!pagePath, 'WordPress multipage Page fixture is required.');
	await verifyPages(page, pagePath, 2, '.browser-page-one', '.browser-page-two', testInfo);
});


test('native page-break links support RTL keyboard navigation without document overflow', async ({ page }, testInfo) => {
	test.skip(!pagePath || ![320, 390, 1440].includes(viewport(testInfo)));
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	await page.locator('html').evaluate((node) => { node.dir = 'rtl'; });
	const second = page.getByRole('navigation', { name: 'Content pages' }).getByRole('link', { name: '2' });
	await second.focus();
	await expect(second).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('.browser-page-two')).toBeVisible();
	await expectSettledLayout(page, 'RTL keyboard pagination');
});
