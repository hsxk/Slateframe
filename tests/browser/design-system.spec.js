const { test, expect } = require('@playwright/test');

const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || pagePath;
const photoPath = process.env.SLATEFRAME_PHOTO_PATH || pagePath;

async function rootTokens(page, names) {
	return page.evaluate((tokenNames) => {
		const styles = getComputedStyle(document.documentElement);
		return Object.fromEntries(tokenNames.map((name) => [name, styles.getPropertyValue(name).trim()]));
	}, names);
}

test('semantic spatial tokens are defined and non-empty', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const names = [
		'--slateframe-control', '--slateframe-inline-gap', '--slateframe-component-gap',
		'--slateframe-stack-gap', '--slateframe-media-gap', '--slateframe-caption-gap',
		'--slateframe-prose-gap', '--slateframe-heading-gap', '--slateframe-gutter',
		'--slateframe-section', '--slateframe-content', '--slateframe-wide',
		'--slateframe-radius', '--slateframe-focus-width', '--slateframe-icon-size',
	];
	const tokens = await rootTokens(page, names);
	for (const name of names) expect(tokens[name], name).not.toBe('');
});

test('control family shares the accessible minimum target', async ({ page }) => {
	await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });
	const controls = page.locator('.slateframe-search-form input, .slateframe-search-form button, .slateframe-pagination a:visible');
	for (let i = 0; i < await controls.count(); i += 1) {
		const box = await controls.nth(i).boundingBox();
		expect(box?.height || 0).toBeGreaterThanOrEqual(44);
	}
});

test('focus ring is a visible semantic token rather than browser-default suppression', async ({ page }) => {
	await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });
	const field = page.locator('.slateframe-search-form input[type="search"]');
	await field.focus();
	const focus = await field.evaluate((node) => {
		const styles = getComputedStyle(node);
		return { style: styles.outlineStyle, width: parseFloat(styles.outlineWidth), offset: parseFloat(styles.outlineOffset) };
	});
	expect(focus.style).not.toBe('none');
	expect(focus.width).toBeGreaterThanOrEqual(2);
	expect(focus.offset).toBeGreaterThanOrEqual(2);
});

test('reading and wide measures preserve hierarchy on desktop', async ({ page }, testInfo) => {
	test.skip((testInfo.project.use.viewport?.width || 0) < 1024, 'Desktop measure contract.');
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	const widths = await page.evaluate(() => {
		const normal = document.querySelector('.browser-default-prose');
		const wide = document.querySelector('.browser-wide-block');
		return { normal: normal?.getBoundingClientRect().width || 0, wide: wide?.getBoundingClientRect().width || 0 };
	});
	expect(widths.normal).toBeGreaterThan(500);
	expect(widths.wide).toBeGreaterThan(widths.normal + 150);
});

test('caption rhythm is subordinate to media rhythm', async ({ page }) => {
	await page.goto(photoPath, { waitUntil: 'networkidle' });
	const values = await page.evaluate(() => {
		const probe = (token) => {
			const node = document.createElement('i');
			node.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${token})`;
			document.body.append(node);
			const value = parseFloat(getComputedStyle(node).inlineSize);
			node.remove();
			return value;
		};
		return { caption: probe('--slateframe-caption-gap'), media: probe('--slateframe-media-gap') };
	});
	expect(values.caption).toBeGreaterThan(0);
	expect(values.caption).toBeLessThanOrEqual(values.media);
});

test('surface hierarchy remains distinct in both color schemes', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	for (const mode of ['light', 'dark']) {
		await page.evaluate((value) => document.documentElement.dataset.slateframeColorMode = value, mode);
		const colors = await page.evaluate(() => {
			const s = getComputedStyle(document.documentElement);
			return ['--slateframe-bg', '--slateframe-surface', '--slateframe-surface-soft', '--slateframe-text']
				.map((name) => s.getPropertyValue(name).trim());
		});
		expect(new Set(colors).size, mode).toBe(4);
	}
});

test('logical page gutters remain symmetric in LTR and RTL', async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	for (const dir of ['ltr', 'rtl']) {
		await page.evaluate((value) => document.documentElement.dir = value, dir);
		const shell = await page.locator('.slateframe-header-inner').boundingBox();
		const viewport = await page.evaluate(() => document.documentElement.clientWidth);
		expect(Math.abs((shell?.x || 0) - (viewport - ((shell?.x || 0) + (shell?.width || 0))))).toBeLessThanOrEqual(2);
	}
});

test('long translated controls do not shrink below touch baseline', async ({ page }) => {
	await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });
	const button = page.locator('.slateframe-search-form button');
	await button.evaluate((node) => { node.textContent = 'Search all published articles and reference materials'; });
	const box = await button.boundingBox();
	expect(box?.height || 0).toBeGreaterThanOrEqual(44);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
		await page.evaluate(() => document.documentElement.clientWidth + 1)
	);
});

test('reduced motion removes meaningful transition duration', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	const duration = await page.locator('.slateframe-card-media img, .wp-block-post-featured-image img').first()
		.evaluate((node) => getComputedStyle(node).transitionDuration);
	expect(duration === '0s' || duration === '0.00001s').toBeTruthy();
});

test('design system remains viewport-contained after 200 percent zoom equivalent', async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow).toBeLessThanOrEqual(1);
});
