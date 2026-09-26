const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || pagePath;
const profileName = process.env.SLATEFRAME_APPEARANCE_PROFILE || 'default';
const profiles = {
	default: { control: 44, spacing: 1, gutter: 16, section: 1, radius: 12, content: 736, wide: 1184 },
	compact: { control: 44, spacing: 0.9, gutter: 14, section: 0.85, radius: 0, content: 640, wide: 1024 },
	spacious: { control: 56, spacing: 1.2, gutter: 28, section: 1.2, radius: 16, content: 800, wide: 1280 },
};
const profile = profiles[profileName];
const width = (testInfo) => Number(testInfo.project.name.replace('viewport-', ''));
const near = (received, expected, tolerance = 1) => expect(Math.abs(received - expected)).toBeLessThanOrEqual(tolerance);

test.beforeEach(({}, testInfo) => {
	test.skip(![390, 1440].includes(width(testInfo)), 'Appearance profiles use representative mobile and desktop widths.');
	if (!profile) throw new Error(`Unknown appearance profile: ${profileName}`);
});

test('bounded appearance profile drives semantic design tokens and real controls', async ({ page }, testInfo) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const metrics = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		const rem = Number.parseFloat(root.fontSize);
		const px = (name) => {
			const value = root.getPropertyValue(name).trim();
			return value.endsWith('rem') ? Number.parseFloat(value) * rem : Number.parseFloat(value);
		};
		const normal = document.querySelector('.browser-default-prose');
		const wide = document.querySelector('.browser-wide-block');
		const shell = document.querySelector('.slateframe-header-inner');
		const summary = document.querySelector('.browser-details summary');
		return {
			control: px('--slateframe-control'), spacing: Number.parseFloat(root.getPropertyValue('--slateframe-space-scale')),
			gutter: px('--slateframe-gutter-min'), section: Number.parseFloat(root.getPropertyValue('--slateframe-section-scale')),
			sectionMin: px('--slateframe-section-min'), sectionMax: px('--slateframe-section-max'), radius: px('--slateframe-radius'),
			content: px('--slateframe-content'), wide: px('--slateframe-wide'), inlineGap: px('--slateframe-inline-gap'),
			componentGap: px('--slateframe-component-gap'), stackGap: px('--slateframe-stack-gap'),
			proseGap: px('--slateframe-prose-gap'), headingGap: px('--slateframe-heading-gap'),
			headingAfter: px('--slateframe-heading-after'), listItemGap: px('--slateframe-list-item-gap'),
			controlPaddingBlock: px('--slateframe-control-padding-block'), controlPaddingInline: px('--slateframe-control-padding-inline'),
			normalWidth: normal?.getBoundingClientRect().width || 0,
			wideWidth: wide?.getBoundingClientRect().width || 0, shellInset: shell?.getBoundingClientRect().left || 0,
			summaryHeight: summary?.getBoundingClientRect().height || 0, viewport: document.documentElement.clientWidth,
		};
	});
	near(metrics.control, profile.control); near(metrics.spacing, profile.spacing, 0.01); near(metrics.gutter, profile.gutter);
	near(metrics.section, profile.section, 0.01); near(metrics.sectionMin, 44 * profile.section); near(metrics.sectionMax, 72 * profile.section);
	near(metrics.radius, profile.radius); near(metrics.content, profile.content); near(metrics.wide, profile.wide);
	near(metrics.inlineGap, 4 * profile.spacing); near(metrics.componentGap, 12 * profile.spacing);
	near(metrics.stackGap, 16 * profile.spacing); near(metrics.proseGap, 20 * profile.spacing);
	near(metrics.headingGap, 36 * profile.spacing); near(metrics.headingAfter, 10 * profile.spacing);
	near(metrics.listItemGap, 8 * profile.spacing); near(metrics.controlPaddingBlock, 8 * profile.spacing);
	near(metrics.controlPaddingInline, 12 * profile.spacing);
	expect(metrics.summaryHeight).toBeGreaterThanOrEqual(profile.control - 1);
	const gutter = Math.min(profile.gutter * 2, Math.max(profile.gutter, metrics.viewport * 0.03));
	const centeredWideInset = Math.max(0, (metrics.viewport - profile.wide) / 2);
	near(metrics.shellInset, Math.max(gutter, centeredWideInset), 1.5);
	expect(metrics.normalWidth).toBeLessThanOrEqual(Math.min(profile.content, metrics.viewport - (2 * gutter)) + 2);
	expect(metrics.wideWidth).toBeLessThanOrEqual(Math.min(profile.wide, metrics.viewport - (2 * gutter)) + 2);
	if (width(testInfo) === 1440) expect(metrics.wideWidth).toBeGreaterThan(metrics.normalWidth + 150);
	const target = width(testInfo) <= 900 ? page.locator('[data-menu-toggle]') : page.locator('[data-primary-nav] a').first();
	await expect(target).toBeVisible();
	expect((await target.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
	await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });
	for (const locator of [page.locator('.slateframe-search-form input[type="search"]'), page.locator('.slateframe-search-form button')]) {
		await expect(locator).toBeVisible();
		expect((await locator.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
		near(await locator.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderRadius)), profile.radius, 1);
		near(await locator.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingInlineStart)), 12 * profile.spacing, 1);
	}

	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const commentInput = page.locator('.slateframe-comments .comment-form-author input').first();
	const commentTextarea = page.locator('.slateframe-comments textarea').first();
	await expect(commentInput).toBeVisible();
	await expect(commentTextarea).toBeVisible();
	expect((await commentInput.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
	for (const field of [commentInput, commentTextarea]) {
		near(await field.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderRadius)), profile.radius, 1);
	}
});

test('appearance profile stays contained across content modes and captures review evidence', async ({ page }, testInfo) => {
	const routes = [['page', pagePath], ['showcase', showcasePath], ['photography', process.env.SLATEFRAME_PHOTO_PATH],
		['portfolio', process.env.SLATEFRAME_PROJECT_PATH], ['knowledge', process.env.SLATEFRAME_KNOWLEDGE_PATH]].filter(([, route]) => route);
	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	for (const [name, route] of routes) {
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
			`${profileName} profile overflow on ${name}`).toBeLessThanOrEqual(1);
		if (['page', 'showcase'].includes(name)) {
			await page.screenshot({ path: path.join(screenshotDir, `appearance-${profileName}-${testInfo.project.name}-${name}.png`), fullPage: true });
		}
	}
});
