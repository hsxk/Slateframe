const { test, expect } = require('@playwright/test');

const rasterPath = process.env.SLATEFRAME_RASTER_PHOTO_PATH;

test.skip(!rasterPath, 'Raster photography fixture is only available in the focused CI workflow.');

async function openRasterPhotography(page) {
	await page.goto(rasterPath, { waitUntil: 'networkidle' });
	await expect(page.locator('#main-content')).toBeVisible();
}

async function openLightbox(page, activation = 'click') {
	const trigger = page.locator('#main-content button.wp-lightbox-container, #main-content .wp-lightbox-container button').first();
	await expect(trigger).toBeVisible();
	if (activation === 'keyboard') {
		await trigger.focus();
		await expect(trigger).toBeFocused();
		await page.keyboard.press('Enter');
	} else {
		await trigger.click();
	}
	const dialog = page.locator('[role="dialog"]').last();
	await expect(dialog).toBeVisible();
	return { trigger, dialog, enlarged: dialog.locator('img[sizes="100vw"]').last(), close: dialog.getByRole('button', { name: /close/i }) };
}

function seconds(value) {
	return value.split(',').map((duration) => {
		const item = duration.trim();
		return item.endsWith('ms') ? Number.parseFloat(item) / 1000 : Number.parseFloat(item);
	}).filter(Number.isFinite);
}

test('raster photography exposes responsive candidates and stable intrinsic geometry', async ({ page }) => {
	await openRasterPhotography(page);
	const image = page.locator('#main-content img.wp-image-raster').first();
	await expect(image).toBeVisible();
	const data = await image.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		return { width: Number(node.getAttribute('width')), height: Number(node.getAttribute('height')), renderedWidth: rect.width, renderedHeight: rect.height, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight, srcset: node.getAttribute('srcset') || '', sizes: node.getAttribute('sizes') || '', currentSrc: node.currentSrc || '' };
	});
	expect(data.width).toBeGreaterThan(0);
	expect(data.height).toBeGreaterThan(0);
	expect(data.renderedWidth).toBeGreaterThan(0);
	expect(data.renderedHeight).toBeGreaterThan(0);
	expect(data.naturalWidth).toBeGreaterThanOrEqual(Math.floor(data.renderedWidth));
	expect(data.naturalHeight).toBeGreaterThanOrEqual(Math.floor(data.renderedHeight));
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

test('native lightbox opens from keyboard and exposes responsive enlarged media', async ({ page }) => {
	await openRasterPhotography(page);
	const { enlarged } = await openLightbox(page, 'keyboard');
	await expect(enlarged).toBeVisible();
	const media = await enlarged.evaluate((node) => ({ srcset: node.getAttribute('srcset') || '', currentSrc: node.currentSrc || '' }));
	expect(media.srcset.split(',').length).toBeGreaterThanOrEqual(2);
	expect(media.currentSrc).toContain('slateframe-raster');
	const geometry = await enlarged.evaluate((node) => { const box = node.getBoundingClientRect(); return { renderedWidth: box.width, renderedHeight: box.height, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight }; });
	expect(geometry.naturalWidth).toBeGreaterThanOrEqual(Math.floor(geometry.renderedWidth));
	expect(geometry.naturalHeight).toBeGreaterThanOrEqual(Math.floor(geometry.renderedHeight));
});

test('native lightbox closes with Escape and restores focus', async ({ page }) => {
	await openRasterPhotography(page);
	const { trigger, dialog, enlarged } = await openLightbox(page, 'keyboard');
	await expect(enlarged).toBeVisible();
	await dialog.focus();
	await expect(dialog).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
});


test('native lightbox exposes an accessible close target and prevents background scrolling', async ({ page }) => {
	await openRasterPhotography(page);
	const { dialog, close } = await openLightbox(page, 'keyboard');
	await expect(dialog).toHaveAccessibleName(/Raster landscape fixture/i);
	await expect(close).toBeVisible();
	const target = await close.evaluate((node) => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height }; });
	expect(target.width).toBeGreaterThanOrEqual(44);
	expect(target.height).toBeGreaterThanOrEqual(44);

	const before = await page.evaluate(() => ({
		horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		scrollY: window.scrollY,
		scrollHeight: document.documentElement.scrollHeight,
		clientHeight: document.documentElement.clientHeight,
	}));
	expect(before.horizontal).toBeLessThanOrEqual(1);
	expect(before.scrollHeight).toBeGreaterThan(before.clientHeight + 100);

	const viewport = page.viewportSize();
	if (!viewport) throw new Error('Expected a configured viewport.');
	await page.mouse.move(Math.floor(viewport.width / 2), Math.floor(viewport.height / 2));
	await page.mouse.wheel(0, before.scrollY > 50 ? -600 : 600);
	await page.waitForTimeout(100);
	expect(await page.evaluate(() => window.scrollY)).toBe(before.scrollY);
});

test('native lightbox close control restores focus to its trigger', async ({ page }) => {
	await openRasterPhotography(page);
	const { trigger, dialog, close } = await openLightbox(page, 'keyboard');
	await close.click();
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
});

test('native lightbox enlarged media remains contained after its opening transition', async ({ page }) => {
	await openRasterPhotography(page);
	const { enlarged } = await openLightbox(page);
	await expect(enlarged).toBeVisible();
	await expect.poll(async () => enlarged.evaluate((node) => {
		const box = node.getBoundingClientRect();
		return Math.max(0, -box.left, box.right - innerWidth, -box.top, box.bottom - innerHeight);
	}), { message: 'enlarged media should settle fully inside the viewport' }).toBeLessThanOrEqual(1);
});

test('native lightbox honors reduced-motion preference', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await openRasterPhotography(page);
	const { dialog } = await openLightbox(page);
	const durations = await dialog.evaluate((node) => { const style = getComputedStyle(node); return { transition: style.transitionDuration, animation: style.animationDuration }; });
	for (const duration of [...seconds(durations.transition), ...seconds(durations.animation)]) {
		expect(duration).toBeLessThanOrEqual(0.01);
	}
});
