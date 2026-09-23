const { test, expect } = require('@playwright/test');

const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || '/';

async function expectContained(page, locator, label) {
	const box = await locator.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return { left: rect.left, right: rect.right, width: rect.width, viewport: document.documentElement.clientWidth };
	});
	expect(box.left, `${label} starts outside viewport`).toBeGreaterThanOrEqual(-1);
	expect(box.right, `${label} ends outside viewport`).toBeLessThanOrEqual(box.viewport + 1);
	expect(box.width, `${label} has no usable width`).toBeGreaterThan(40);
}

test.beforeEach(async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	await expect(page.locator('.browser-internationalization-fixture')).toBeVisible();
});

test('CJK copy wraps without viewport overflow', async ({ page }) => {
	const copy = page.locator('.browser-cjk-copy');
	await expect(copy).toHaveAttribute('lang', 'ja');
	await expectContained(page, copy, 'CJK fixture');
	const metrics = await copy.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, whiteSpace: getComputedStyle(element).whiteSpace }));
	expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
	expect(metrics.whiteSpace).not.toBe('nowrap');
});

test('RTL content keeps semantic direction and logical containment', async ({ page }) => {
	const rtl = page.locator('.browser-rtl-copy');
	await expect(rtl).toHaveAttribute('dir', 'rtl');
	await expect(rtl).toHaveAttribute('lang', 'ar');
	await expectContained(page, rtl, 'RTL fixture');
	const direction = await rtl.evaluate((element) => getComputedStyle(element).direction);
	expect(direction).toBe('rtl');
});

test('unbroken identifiers cannot create page-level horizontal scrolling', async ({ page }) => {
	const token = page.locator('.browser-long-token');
	await expectContained(page, token, 'long token fixture');
	const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
	expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
});

test('multilingual tables remain reachable without widening the document', async ({ page }) => {
	const table = page.locator('.browser-i18n-table');
	await expect(table).toBeVisible();
	await expectContained(page, table, 'multilingual table wrapper');
	const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
	expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
});

test('mixed writing systems retain readable computed typography', async ({ page }) => {
	for (const selector of ['.browser-cjk-copy', '.browser-rtl-copy']) {
		const typography = await page.locator(selector).evaluate((element) => {
			const styles = getComputedStyle(element);
			return { fontSize: Number.parseFloat(styles.fontSize), lineHeight: Number.parseFloat(styles.lineHeight) };
		});
		expect(typography.fontSize).toBeGreaterThanOrEqual(16);
		expect(typography.lineHeight).toBeGreaterThan(typography.fontSize * 1.35);
	}
});

test('international fixture preserves document semantics', async ({ page }) => {
	await expect(page.locator('.browser-internationalization-fixture h2')).toHaveCount(1);
	await expect(page.locator('.browser-rtl-copy h3')).toHaveCount(1);
	await expect(page.locator('.browser-i18n-table th')).toHaveCount(2);
	await expect(page.locator('.browser-i18n-table td')).toHaveCount(4);
});
