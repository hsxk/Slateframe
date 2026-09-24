const { test, expect } = require('@playwright/test');

const rasterPath = process.env.SLATEFRAME_RASTER_PHOTO_PATH;

test.skip(!rasterPath, 'Raster photography fixture is only available in the focused CI workflow.');

async function openRasterPhotography(page) {
	await page.goto(rasterPath, { waitUntil: 'networkidle' });
	await expect(page.locator('#main-content')).toBeVisible();
}

test('raster photography exposes responsive candidates and stable intrinsic geometry', async ({ page }) => {
	await openRasterPhotography(page);
	const image = page.locator('#main-content img.wp-image-raster').first();
	await expect(image).toBeVisible();
	const data = await image.evaluate((node) => ({ width: Number(node.getAttribute('width')), height: Number(node.getAttribute('height')), naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight, srcset: node.getAttribute('srcset') || '', sizes: node.getAttribute('sizes') || '', currentSrc: node.currentSrc || '' }));
	expect(data.width).toBeGreaterThan(0);
	expect(data.height).toBeGreaterThan(0);
	expect(data.naturalWidth).toBeGreaterThanOrEqual(data.width);
	expect(data.naturalHeight).toBeGreaterThanOrEqual(data.height);
	expect(data.srcset.split(',').length).toBeGreaterThanOrEqual(2);
	expect(data.sizes).not.toBe('');
	expect(data.currentSrc).not.toBe('');
});

test('raster candidate selection remains appropriate for the rendered viewport', async ({ page }) => {
	await openRasterPhotography(page);
	const data = await page.locator('#main-content img.wp-image-raster').first().evaluate((node) => { const rect = node.getBoundingClientRect(); return { renderedWidth: rect.width, viewportWidth: document.documentElement.clientWidth, currentSrc: node.currentSrc, overflow: rect.right - document.documentElement.clientWidth }; });
	expect(data.renderedWidth).toBeGreaterThan(0);
	expect(data.renderedWidth).toBeLessThanOrEqual(data.viewportWidth + 1);
	expect(data.overflow).toBeLessThanOrEqual(1);
	expect(data.currentSrc).toContain('slateframe-raster');
});

test('native lightbox opens from keyboard and exposes a dialog', async ({ page }) => {
	await openRasterPhotography(page);
	const trigger = page.locator('#main-content button.wp-lightbox-container, #main-content .wp-lightbox-container button').first();
	await expect(trigger).toBeVisible();
	await trigger.focus();
	await expect(trigger).toBeFocused();
	await page.keyboard.press('Enter');
	const dialog = page.locator('[role="dialog"]').last();
	await expect(dialog).toBeVisible();
	await expect(dialog.locator('img')).toBeVisible();
});

test('native lightbox closes with Escape and restores focus', async ({ page }) => {
	await openRasterPhotography(page);
	const trigger = page.locator('#main-content button.wp-lightbox-container, #main-content .wp-lightbox-container button').first();
	await trigger.focus();
	await page.keyboard.press('Enter');
	const dialog = page.locator('[role="dialog"]').last();
	await expect(dialog).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
});

test('native lightbox remains contained on narrow and wide viewports', async ({ page }) => {
	await openRasterPhotography(page);
	const trigger = page.locator('#main-content button.wp-lightbox-container, #main-content .wp-lightbox-container button').first();
	await trigger.click();
	const dialog = page.locator('[role="dialog"]').last();
	await expect(dialog).toBeVisible();
	const rect = await dialog.locator('img').evaluate((node) => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: innerWidth, height: innerHeight }; });
	expect(rect.left).toBeGreaterThanOrEqual(-1);
	expect(rect.right).toBeLessThanOrEqual(rect.width + 1);
	expect(rect.top).toBeGreaterThanOrEqual(-1);
	expect(rect.bottom).toBeLessThanOrEqual(rect.height + 1);
});

test('native lightbox honors reduced-motion preference', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await openRasterPhotography(page);
	const trigger = page.locator('#main-content button.wp-lightbox-container, #main-content .wp-lightbox-container button').first();
	await trigger.click();
	const dialog = page.locator('[role="dialog"]').last();
	await expect(dialog).toBeVisible();
	const durations = await dialog.evaluate((node) => { const style = getComputedStyle(node); return { transition: style.transitionDuration, animation: style.animationDuration }; });
	expect(['0s', '0.01s']).toContain(durations.transition);
	expect(['0s', '0.01s']).toContain(durations.animation);
});
