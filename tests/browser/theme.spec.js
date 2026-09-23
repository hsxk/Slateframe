const fs = require('node:fs/promises');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';

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
