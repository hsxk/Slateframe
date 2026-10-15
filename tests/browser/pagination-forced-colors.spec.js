const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const postPath = process.env.SLATEFRAME_MULTIPAGE_POST_PATH;
const projectPath = process.env.SLATEFRAME_PROJECT_PATH;
const width = (info) => info.project.use.viewport?.width || 0;

async function selectedState(current) {
	return current.evaluate((node) => {
		const style = getComputedStyle(node);
		const probe = document.createElement('span');
		probe.style.color = 'Highlight';
		document.body.append(probe);
		const highlight = getComputedStyle(probe).color;
		probe.remove();
		const box = node.getBoundingClientRect();
		return {
			color: style.outlineColor,
			highlight,
			outline: style.outlineStyle,
			width: parseFloat(style.outlineWidth),
			offset: parseFloat(style.outlineOffset),
			targetWidth: box.width,
			targetHeight: box.height,
			overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		};
	});
}

function expectSelectedState(state, label) {
	expect(state.color, `${label}: ${JSON.stringify(state)}`).toBe(state.highlight);
	expect(state.outline).toBe('solid');
	expect(state.width).toBeGreaterThanOrEqual(2);
	expect(state.offset).toBeLessThanOrEqual(-2);
	expect(state.targetWidth).toBeGreaterThanOrEqual(44);
	expect(state.targetHeight).toBeGreaterThanOrEqual(44);
	expect(state.overflow).toBeLessThanOrEqual(1);
}

async function capture(page, name, info) {
	if (![320, 390, 1440].includes(width(info))) return;
	const folder = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(folder, { recursive: true });
	await page.screenshot({ path: path.join(folder, `${name}-${width(info)}.png`), fullPage: true });
}

test('native WordPress article pagination has a non-color selected marker in forced colors', async ({ page }, info) => {
	test.skip(!postPath, 'Requires the existing WordPress multipage post fixture.');
	await page.emulateMedia({ forcedColors: 'active' });
	await page.goto(postPath, { waitUntil: 'networkidle' });
	const nav = page.getByRole('navigation', { name: 'Content pages' });
	const current = nav.locator('.post-page-numbers[aria-current="page"]');
	const next = nav.getByRole('link', { name: '2' });
	await expect(current).toHaveCount(1);
	await expect(current).toHaveClass(/current/);
	for (const dir of ['ltr', 'rtl']) {
		await page.locator('html').evaluate((node, direction) => { node.dir = direction; node.style.fontSize = '200%'; }, dir);
		await next.focus();
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.press('Tab');
		await expect(next).toBeFocused();
		await expect(next).toHaveJSProperty('tagName', 'A');
		expectSelectedState(await selectedState(current), `article ${dir}`);
		await capture(page, `pagination-forced-colors-${dir}`, info);
	}
	if (width(info) === 320) {
		await page.locator('html').evaluate((node) => { node.dir = 'rtl'; node.style.fontSize = '400%'; });
		expectSelectedState(await selectedState(current), 'article 320 RTL 400%');
		await capture(page, 'pagination-forced-colors-rtl-400', info);
	}
});

test('Core Query Loop pagination uses the same selected marker in both directions', async ({ page }, info) => {
	test.skip(!projectPath, 'Requires the existing seven-post Portfolio Query Loop fixture.');
	await page.emulateMedia({ forcedColors: 'active' });
	await page.goto(projectPath, { waitUntil: 'networkidle' });
	const nav = page.locator('.wp-block-query-pagination');
	const current = nav.locator('.page-numbers[aria-current="page"]');
	await expect(current).toHaveCount(1);
	await expect(current).toHaveClass(/current/);
	for (const dir of ['ltr', 'rtl']) {
		await page.locator('html').evaluate((node, direction) => { node.dir = direction; node.style.fontSize = '200%'; }, dir);
		expectSelectedState(await selectedState(current), `query ${dir}`);
		await capture(page, `query-pagination-forced-colors-${dir}`, info);
	}
});
