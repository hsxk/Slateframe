const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const photoPath = process.env.SLATEFRAME_PHOTO_PATH || pagePath;
const expectedSiteMode = process.env.SLATEFRAME_SITE_COLOR_MODE || 'system';
const representativeWidths = [390, 1440];
const width = (testInfo) => Number(testInfo.project.name.replace('viewport-', ''));

test.beforeEach(({}, testInfo) => {
	test.skip(!representativeWidths.includes(width(testInfo)), 'Color-mode evidence uses representative mobile and desktop widths.');
});

const readMode = async (page) => page.evaluate(() => {
	const root = document.documentElement;
	const body = getComputedStyle(document.body);
	const toggle = document.querySelector('[data-color-toggle]');
	return {
		attribute: root.getAttribute('data-slateframe-color-mode'),
		colorScheme: getComputedStyle(root).colorScheme,
		background: body.backgroundColor,
		text: body.color,
		togglePressed: toggle?.getAttribute('aria-pressed') || null,
		overflow: root.scrollWidth - root.clientWidth,
	};
});

const ensureDark = async (page) => {
	const state = await readMode(page);
	if (state.colorScheme !== 'dark') {
		await page.locator('[data-color-toggle]').click();
	}
	await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
};

test('system/site default, accessible toggle, and visitor preference stay coherent', async ({ page, context }, testInfo) => {
	await context.clearCookies();
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const initial = await readMode(page);
	expect(initial.attribute).toBe(expectedSiteMode === 'system' ? null : expectedSiteMode);
	expect(initial.colorScheme).toBe(expectedSiteMode === 'light' ? 'light' : 'dark');
	expect(initial.background).toBe(expectedSiteMode === 'light' ? 'rgb(247, 247, 244)' : 'rgb(17, 20, 18)');
	expect(initial.text).toBe(expectedSiteMode === 'light' ? 'rgb(23, 25, 24)' : 'rgb(238, 241, 238)');
	expect(initial.overflow).toBeLessThanOrEqual(1);

	const toggle = page.locator('[data-color-toggle]');
	await expect(toggle).toBeVisible();
	await expect(toggle).toHaveAccessibleName('Dark mode');
	expect((await toggle.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	expect((await toggle.boundingBox())?.width || 0).toBeGreaterThanOrEqual(44);

	const initialDark = initial.colorScheme === 'dark';
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', initialDark ? 'false' : 'true');
	await expect(page.locator('html')).toHaveAttribute('data-slateframe-color-mode', initialDark ? 'light' : 'dark');

	const cookies = await context.cookies();
	const preference = cookies.find((cookie) => cookie.name === 'slateframe_color_mode');
	expect(preference?.value).toBe(initialDark ? 'light' : 'dark');
	expect(preference?.sameSite).toBe('Lax');

	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.locator('html')).toHaveAttribute('data-slateframe-color-mode', initialDark ? 'light' : 'dark');

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	await ensureDark(page);
	await page.screenshot({
		path: path.join(screenshotDir, `color-${expectedSiteMode}-dark-${testInfo.project.name}-page.png`),
		fullPage: true,
	});
	await page.locator('[data-color-toggle]').click();
	await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
	await page.screenshot({
		path: path.join(screenshotDir, `color-${expectedSiteMode}-light-${testInfo.project.name}-page.png`),
		fullPage: true,
	});
});

test('dark palette reaches forms, reading surfaces, mobile navigation, and photography', async ({ page, context }, testInfo) => {
	await context.clearCookies();
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	await ensureDark(page);

	const surfaceMetrics = await page.evaluate(() => {
		const comment = document.querySelector('.slateframe-comments input');
		const tableHead = document.querySelector('.wp-block-table th');
		const code = document.querySelector('.wp-block-code');
		return {
			comment: comment ? getComputedStyle(comment).backgroundColor : '',
			tableHead: tableHead ? getComputedStyle(tableHead).backgroundColor : '',
			code: code ? getComputedStyle(code).backgroundColor : '',
		};
	});
	expect(surfaceMetrics.comment).toBe('rgb(24, 28, 26)');
	expect(surfaceMetrics.tableHead).toBe('rgb(32, 38, 34)');
	expect(surfaceMetrics.code).not.toBe('rgb(247, 247, 244)');

	if (width(testInfo) === 390) {
		await page.locator('[data-menu-toggle]').click();
		await expect(page.locator('[data-primary-nav]')).toBeVisible();
		await expect(page.locator('[data-primary-nav]')).toHaveCSS('background-color', 'rgb(24, 28, 26)');
		await page.keyboard.press('Escape');
	}

	await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });
	await ensureDark(page);
	await expect(page.locator('.slateframe-search-form input[type="search"]')).toHaveCSS('background-color', 'rgb(24, 28, 26)');
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

	await page.goto(photoPath, { waitUntil: 'networkidle' });
	await ensureDark(page);
	await expect(page.locator('.is-style-slateframe-contact-sheet .wp-block-image').first()).toHaveCSS('background-color', 'rgb(32, 38, 34)');
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	await page.screenshot({
		path: path.join(screenshotDir, `color-${expectedSiteMode}-dark-${testInfo.project.name}-photography.png`),
		fullPage: true,
	});
});
