const fs = require('node:fs/promises');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';

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
	const routes = ['/', postPath, pagePath, '/?s=Slateframe', '/slateframe-browser-missing/'];

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

	if (testInfo.project.name === 'mobile-chromium') {
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(page.locator('[data-primary-nav]')).not.toHaveAttribute('inert', '');

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

test('article comment controls stay inside the reading canvas', async ({ page }) => {
	await page.goto(postPath, { waitUntil: 'networkidle' });

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
	await expectNoHorizontalOverflow(page, postPath);
});

test('wide and full blocks can leave the prose measure', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop-chromium', 'Width comparison is desktop-specific.');

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
