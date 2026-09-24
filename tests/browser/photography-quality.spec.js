const { test, expect } = require('@playwright/test');

const photoPath = process.env.SLATEFRAME_PHOTO_PATH || '/';

async function openPhotography(page) {
	await page.goto(photoPath, { waitUntil: 'networkidle' });
	await expect(page.locator('#main-content')).toBeVisible();
}

test('photography images preserve intrinsic dimensions for layout stability', async ({ page }) => {
	await openPhotography(page);
	const images = page.locator('#main-content img');
	await expect(images.first()).toBeVisible();

	const metrics = await images.evaluateAll((nodes) => nodes.map((image) => ({
		width: image.getAttribute('width'),
		height: image.getAttribute('height'),
		naturalWidth: image.naturalWidth,
		naturalHeight: image.naturalHeight,
	})));

	for (const image of metrics) {
		expect(image.naturalWidth).toBeGreaterThan(0);
		expect(image.naturalHeight).toBeGreaterThan(0);
		expect(Number(image.width)).toBeGreaterThan(0);
		expect(Number(image.height)).toBeGreaterThan(0);
	}
});

test('photography media stays responsive without viewport overflow', async ({ page }) => {
	await openPhotography(page);
	const images = page.locator('#main-content img');
	const data = await images.evaluateAll((nodes) => nodes.map((image) => {
		const rect = image.getBoundingClientRect();
		const source = new URL(image.currentSrc || image.src, document.baseURI);
		return {
			srcset: image.getAttribute('srcset') || '',
			sizes: image.getAttribute('sizes') || '',
			currentSrc: image.currentSrc || '',
			isVector: source.pathname.toLowerCase().endsWith('.svg'),
			left: rect.left,
			right: rect.right,
			viewport: document.documentElement.clientWidth,
		};
	}));

	for (const image of data) {
		expect(image.currentSrc).not.toBe('');
		// Raster attachments should expose WordPress responsive candidates. Vector
		// fixtures are resolution-independent and intentionally need no srcset.
		if (!image.isVector) {
			expect(image.srcset).not.toBe('');
			expect(image.sizes).not.toBe('');
		}
		expect(image.left).toBeGreaterThanOrEqual(-1);
		expect(image.right).toBeLessThanOrEqual(image.viewport + 1);
	}
});

test('photography loading hints keep the lead frame eligible for LCP', async ({ page }) => {
	await openPhotography(page);
	const images = page.locator('#main-content img');
	const hints = await images.evaluateAll((nodes) => nodes.map((image) => ({
		loading: image.getAttribute('loading') || '',
		decoding: image.getAttribute('decoding') || '',
		fetchpriority: image.getAttribute('fetchpriority') || '',
	})));

	expect(hints.length).toBeGreaterThan(1);
	expect(hints[0].loading).not.toBe('lazy');
	expect(['', 'async', 'auto']).toContain(hints[0].decoding);
	expect(hints.slice(1).some((image) => image.loading === 'lazy')).toBe(true);
});

test('photography captions remain readable and direction-agnostic', async ({ page }) => {
	await openPhotography(page);
	const captions = page.locator('#main-content figcaption');
	await expect(captions.first()).toBeVisible();

	const styles = await captions.evaluateAll((nodes) => nodes.map((caption) => {
		const style = getComputedStyle(caption);
		const rect = caption.getBoundingClientRect();
		return {
			fontSize: Number.parseFloat(style.fontSize),
			lineHeight: Number.parseFloat(style.lineHeight),
			textAlign: style.textAlign,
			left: rect.left,
			right: rect.right,
			viewport: document.documentElement.clientWidth,
		};
	}));

	for (const caption of styles) {
		expect(caption.fontSize).toBeGreaterThanOrEqual(12);
		expect(caption.lineHeight).toBeGreaterThan(caption.fontSize * 1.35);
		expect(['start', 'left', 'right']).toContain(caption.textAlign);
		expect(caption.left).toBeGreaterThanOrEqual(-1);
		expect(caption.right).toBeLessThanOrEqual(caption.viewport + 1);
	}
});

test('photography layouts preserve natural image geometry', async ({ page }) => {
	await openPhotography(page);
	const styledImages = page.locator('.is-style-slateframe-photo-feature img, .is-style-slateframe-contact-sheet img, .is-style-slateframe-diptych img, .slateframe-gallery-sequence img');
	await expect(styledImages.first()).toBeVisible();

	const styles = await styledImages.evaluateAll((nodes) => nodes.map((image) => {
		const style = getComputedStyle(image);
		return {
			objectFit: style.objectFit,
			height: image.getBoundingClientRect().height,
			width: image.getBoundingClientRect().width,
		};
	}));

	for (const image of styles) {
		expect(['contain', 'fill']).toContain(image.objectFit);
		expect(image.width).toBeGreaterThan(0);
		expect(image.height).toBeGreaterThan(0);
	}
});

test('reduced motion removes decorative photography transforms', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await openPhotography(page);
	const image = page.locator('.slateframe-project-grid .wp-block-post-featured-image img').first();
	if (await image.count()) {
		const transition = await image.evaluate((element) => getComputedStyle(element).transitionDuration);
		expect(transition).toBe('0s');
	}
});
