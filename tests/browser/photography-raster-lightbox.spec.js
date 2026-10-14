const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const rasterPath = process.env.SLATEFRAME_RASTER_PHOTO_PATH;
const representativeWidths = [320, 390, 768, 1440, 1920];
const projectWidth = (testInfo) => Number(testInfo.project.name.replace('viewport-', ''));

test.skip(!rasterPath, 'Raster photography fixture is only available in the focused CI workflow.');

async function openRasterPhotography(page) {
	await page.goto(rasterPath, { waitUntil: 'networkidle' });
	await expect(page.locator('#main-content')).toBeVisible();
}

async function openLightbox(page, activation = 'click', triggerOverride = null) {
	const trigger = triggerOverride || page.locator('#main-content button.wp-lightbox-container, #main-content .wp-lightbox-container button').first();
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

async function expectMediaContained(locator, message) {
	await expect.poll(async () => locator.evaluate((node) => {
		const box = node.getBoundingClientRect();
		return Math.max(
			0,
			-box.left,
			box.right - document.documentElement.clientWidth,
			-box.top,
			box.bottom - innerHeight
		);
	}), { message }).toBeLessThanOrEqual(1);
}

async function expectLightboxSettled(dialog, enlarged, message) {
	await expect.poll(async () => dialog.evaluate((node) =>
		node.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length
	), { message: `${message}: animations should finish`, timeout: 5_000 }).toBe(0);

	await expectMediaContained(enlarged, message);

	const first = await enlarged.boundingBox();
	await enlarged.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
	const second = await enlarged.boundingBox();
	for (const key of ['x', 'y', 'width', 'height']) {
		expect(Math.abs((second?.[key] || 0) - (first?.[key] || 0)), `${message}: ${key} should settle between animation frames`).toBeLessThanOrEqual(1);
	}
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

test('mixed raster gallery preserves responsive portrait and square media without cropping', async ({ page }, testInfo) => {
	await openRasterPhotography(page);
	const gallery = page.locator('.browser-raster-gallery');
	await expect(gallery).toBeVisible();
	const images = gallery.locator('img');
	await expect(images).toHaveCount(2);
	if (projectWidth(testInfo) <= 420) {
		const layout = await gallery.evaluate((node) => ({
			display: getComputedStyle(node).display,
			columns: getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length,
			widths: [...node.querySelectorAll(':scope > figure')].map((figure) => figure.getBoundingClientRect().width),
		}));
		expect(layout.display).toBe('grid');
		expect(layout.columns).toBe(1);
		expect(layout.widths).toHaveLength(2);
		for (const width of layout.widths) expect(width).toBeGreaterThan(240);
	}
	const metrics = await images.evaluateAll((nodes) => nodes.map((node) => {
		const box = node.getBoundingClientRect();
		return {
			naturalWidth: node.naturalWidth,
			naturalHeight: node.naturalHeight,
			renderedWidth: box.width,
			renderedHeight: box.height,
			srcset: node.getAttribute('srcset') || '',
			sizes: node.getAttribute('sizes') || '',
		};
	}));
	expect(metrics[0].naturalHeight).toBeGreaterThan(metrics[0].naturalWidth);
	expect(Math.abs(metrics[1].naturalWidth - metrics[1].naturalHeight)).toBeLessThanOrEqual(2);
	for (const item of metrics) {
		expect(item.renderedWidth).toBeGreaterThan(0);
		expect(item.renderedHeight).toBeGreaterThan(0);
		expect(item.srcset.split(',').length).toBeGreaterThanOrEqual(2);
		expect(item.sizes).not.toBe('');
	}
	const captions = gallery.locator('figcaption');
	await expect(captions).toHaveCount(2);
	for (let index = 0; index < await captions.count(); index += 1) {
		const style = await captions.nth(index).evaluate((node) => {
			const computed = getComputedStyle(node);
			return {
				position: computed.position,
				wrap: computed.overflowWrap,
				fontPx: Number.parseFloat(computed.fontSize),
				rootFontPx: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
				lineHeightPx: Number.parseFloat(computed.lineHeight),
			};
		});
		expect(style.position).toBe('static');
		expect(style.wrap).toBe('anywhere');
		expect(style.fontPx / style.rootFontPx).toBeGreaterThanOrEqual(0.87);
		expect(style.lineHeightPx / style.fontPx).toBeGreaterThanOrEqual(1.5);
	}
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('native lightbox contains a portrait raster at its intrinsic orientation', async ({ page }) => {
	await openRasterPhotography(page);
	const trigger = page.locator('.browser-raster-gallery button.wp-lightbox-container, .browser-raster-gallery .wp-lightbox-container button').first();
	const { dialog, enlarged } = await openLightbox(page, 'keyboard', trigger);
	await expect(dialog).toHaveAccessibleName(/Raster portrait fixture/i);
	await expect(enlarged).toBeVisible();
	const orientation = await enlarged.evaluate((node) => ({
		naturalWidth: node.naturalWidth,
		naturalHeight: node.naturalHeight,
	}));
	expect(orientation.naturalHeight).toBeGreaterThan(orientation.naturalWidth);
	await expectMediaContained(enlarged, 'portrait lightbox should settle fully inside the dynamic viewport');
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
	await page.evaluate(() => {
		const spacer = document.createElement('div');
		spacer.dataset.scrollLockFixture = 'true';
		spacer.style.blockSize = '200vh';
		document.body.append(spacer);
	});

	const { dialog, close } = await openLightbox(page, 'keyboard');
	await expect(dialog).toHaveAccessibleName(/Raster landscape fixture/i);
	await expect(close).toBeVisible();
	const target = await close.evaluate((node) => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height }; });
	expect(target.width).toBeGreaterThanOrEqual(44);
	expect(target.height).toBeGreaterThanOrEqual(44);

	const locked = await page.evaluate(() => ({
		overflow: getComputedStyle(document.documentElement).overflow,
		overscroll: getComputedStyle(document.documentElement).overscrollBehavior,
		horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		scrollY: window.scrollY,
	}));
	expect(locked.overflow).toBe('hidden');
	expect(locked.overscroll).toBe('none');
	expect(locked.horizontal).toBeLessThanOrEqual(1);

	const viewport = page.viewportSize();
	if (!viewport) throw new Error('Expected a configured viewport.');
	await page.mouse.move(Math.floor(viewport.width / 2), Math.floor(viewport.height / 2));
	await page.mouse.wheel(0, 600);
	await page.waitForTimeout(100);
	expect(await page.evaluate(() => window.scrollY)).toBe(locked.scrollY);

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	const restored = await page.evaluate(() => ({
		overflow: getComputedStyle(document.documentElement).overflow,
		overscroll: getComputedStyle(document.documentElement).overscrollBehavior,
	}));
	expect(restored.overflow).not.toBe('hidden');
	expect(restored.overscroll).not.toBe('none');
});

test('native lightbox dialog has no automated WCAG A or AA violations', async ({ page }) => {
	await openRasterPhotography(page);
	await openLightbox(page, 'keyboard');
	const results = await new AxeBuilder({ page })
		.include('[role="dialog"]')
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(results.violations.map((violation) => ({
		id: violation.id,
		impact: violation.impact,
		targets: violation.nodes.map((node) => node.target),
	}))).toEqual([]);
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

test('photo-feature media chrome does not leak into the native lightbox overlay', async ({ page }) => {
	await openRasterPhotography(page);
	const { dialog } = await openLightbox(page, 'keyboard');
	const frame = dialog.locator('.is-style-slateframe-photo-feature').last();
	await expect(frame).toBeVisible();
	const chrome = await frame.evaluate((node) => {
		const style = getComputedStyle(node);
		return {
			background: style.backgroundColor,
			marginTop: Number.parseFloat(style.marginTop),
			marginBottom: Number.parseFloat(style.marginBottom),
		};
	});
	expect(chrome.background).toBe('rgba(0, 0, 0, 0)');
	expect(chrome.marginTop).toBe(0);
	expect(chrome.marginBottom).toBe(0);
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

test('photography caption presentation is resilient to long translated content', async ({ page }) => {
	await openRasterPhotography(page);
	const caption = page.locator('#main-content figcaption').first();
	await expect(caption).toBeVisible();
	await caption.evaluate((node) => {
		node.textContent = '中文摄影说明与日本語の長いキャプション العربية ' + 'unbroken-reference-token-'.repeat(12);
	});
	const metrics = await caption.evaluate((node) => {
		const box = node.getBoundingClientRect();
		const style = getComputedStyle(node);
		return {
			left: box.left,
			right: box.right,
			viewport: document.documentElement.clientWidth,
			wrap: style.overflowWrap,
			align: style.textAlign,
			rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		};
	});
	expect(metrics.left).toBeGreaterThanOrEqual(-1);
	expect(metrics.right).toBeLessThanOrEqual(metrics.viewport + 1);
	expect(metrics.wrap).toBe('anywhere');
	expect(['start', 'left', 'right']).toContain(metrics.align);
	expect(metrics.rootOverflow).toBeLessThanOrEqual(1);
});

test('native lightbox controls keep the shared touch-target baseline', async ({ page }) => {
	await openRasterPhotography(page);
	const { dialog } = await openLightbox(page, 'keyboard');
	const controls = dialog.locator(':is(.wp-lightbox-close-button,.wp-lightbox-navigation-button-prev,.wp-lightbox-navigation-button-next):visible');
	const count = await controls.count();
	expect(count).toBeGreaterThanOrEqual(1);
	for (let index = 0; index < count; index += 1) {
		const box = await controls.nth(index).boundingBox();
		expect(box?.width || 0).toBeGreaterThanOrEqual(44);
		expect(box?.height || 0).toBeGreaterThanOrEqual(44);
	}
});

test('native lightbox controls inherit Slateframe control geometry and interaction language', async ({ page }) => {
	await openRasterPhotography(page);
	const { dialog, close } = await openLightbox(page, 'keyboard');
	const controls = dialog.locator(':is(.wp-lightbox-close-button,.wp-lightbox-navigation-button-prev,.wp-lightbox-navigation-button-next):visible');
	const controlTokens = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		const probe = document.createElement('span');
		probe.style.color = 'var(--slateframe-media-chrome-text)';
		document.body.append(probe);
		const chromeText = getComputedStyle(probe).color;
		probe.remove();
		return {
			radius: Number.parseFloat(root.getPropertyValue('--slateframe-radius')),
			chromeText,
		};
	});
	const count = await controls.count();
	expect(count).toBeGreaterThanOrEqual(1);

	for (let index = 0; index < count; index += 1) {
		const geometry = await controls.nth(index).evaluate((node) => {
			const rect = node.getBoundingClientRect();
			const style = getComputedStyle(node);
			return {
				left: rect.left,
				top: rect.top,
				right: rect.right,
				bottom: rect.bottom,
				width: rect.width,
				height: rect.height,
				viewportWidth: document.documentElement.clientWidth,
				viewportHeight: window.innerHeight,
				radius: Number.parseFloat(style.borderRadius),
				background: style.backgroundColor,
				fill: style.fill,
				touchAction: style.touchAction,
				boxSizing: style.boxSizing,
				display: style.display,
				paddingBlockStart: Number.parseFloat(style.paddingBlockStart),
			};

		});
		expect(geometry.width).toBeGreaterThanOrEqual(44);
		expect(geometry.height).toBeGreaterThanOrEqual(44);
		expect(geometry.left).toBeGreaterThanOrEqual(-1);
		expect(geometry.top).toBeGreaterThanOrEqual(-1);
		expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
		expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
		expect(Math.abs(geometry.radius - controlTokens.radius)).toBeLessThanOrEqual(1);
		expect(geometry.background).not.toBe('rgba(0, 0, 0, 0)');
		expect(geometry.fill).toBe(controlTokens.chromeText);
		expect(geometry.touchAction).toContain('manipulation');
		expect(geometry.boxSizing).toBe('border-box');
		expect(geometry.display).toBe('grid');
		expect(geometry.paddingBlockStart).toBe(0);
	}

	await close.focus();
	const focus = await close.evaluate((node) => {
		const style = getComputedStyle(node);
		return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
	});
	expect(focus.outlineStyle).not.toBe('none');
	expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
});

test('native lightbox remains contained in RTL and at 200 percent text size', async ({ page }) => {
	await openRasterPhotography(page);
	await page.evaluate(() => {
		document.documentElement.dir = 'rtl';
		document.documentElement.style.fontSize = '200%';
	});
	const { dialog, enlarged, close } = await openLightbox(page, 'keyboard');
	await expect(enlarged).toBeVisible();

	await expect.poll(async () => dialog.evaluate((node) => {
		const media = node.querySelector('img[sizes="100vw"]');
		const mediaBox = media?.getBoundingClientRect();
		const viewportWidth = document.documentElement.clientWidth;
		const viewportHeight = window.innerHeight;
		const rootOverflow = document.documentElement.scrollWidth - viewportWidth;
		return Math.max(
			0,
			rootOverflow,
			-(mediaBox?.left ?? 0),
			(mediaBox?.right ?? 0) - viewportWidth,
			-(mediaBox?.top ?? 0),
			(mediaBox?.bottom ?? 0) - viewportHeight
		);
	}), { message: 'RTL lightbox media should settle within one CSS pixel at 200% text size' }).toBeLessThanOrEqual(1);

	const metrics = await dialog.evaluate((node) => ({
		direction: getComputedStyle(node).direction,
		rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
	}));
	expect(metrics.direction).toBe('rtl');
	expect(metrics.rootOverflow).toBeLessThanOrEqual(1);
	const closeGeometry = await close.evaluate((node) => {
		const box = node.getBoundingClientRect();
		return {
			left: box.left,
			right: box.right,
			top: box.top,
			bottom: box.bottom,
			width: box.width,
			height: box.height,
			viewportWidth: document.documentElement.clientWidth,
			viewportHeight: innerHeight,
		};
	});
	expect(closeGeometry.width).toBeGreaterThanOrEqual(44);
	expect(closeGeometry.height).toBeGreaterThanOrEqual(44);
	expect(closeGeometry.left).toBeGreaterThanOrEqual(-1);
	expect(closeGeometry.top).toBeGreaterThanOrEqual(-1);
	expect(closeGeometry.right).toBeLessThanOrEqual(closeGeometry.viewportWidth + 1);
	expect(closeGeometry.bottom).toBeLessThanOrEqual(closeGeometry.viewportHeight + 1);
});

test('native lightbox controls remain discernible in forced colors', async ({ page }) => {
	await page.emulateMedia({ forcedColors: 'active' });
	await openRasterPhotography(page);
	const { dialog } = await openLightbox(page, 'keyboard');
	const control = dialog.locator(':is(.wp-lightbox-close-button,.wp-lightbox-navigation-button-prev,.wp-lightbox-navigation-button-next):visible').first();
	await expect(control).toBeVisible();
	const styles = await control.evaluate((node) => {
		const style = getComputedStyle(node);
		return {
			borderStyle: style.borderStyle,
			borderWidth: Number.parseFloat(style.borderWidth),
			forcedColorAdjust: style.forcedColorAdjust,
		};
	});
	expect(styles.borderStyle).not.toBe('none');
	expect(styles.borderWidth).toBeGreaterThanOrEqual(1);
	expect(styles.forcedColorAdjust).toBe('auto');
});

test('native lightbox captures representative mobile and desktop evidence', async ({ page }, testInfo) => {
	test.skip(!representativeWidths.includes(projectWidth(testInfo)), 'Focused visual evidence uses representative mobile and desktop widths.');
	await openRasterPhotography(page);
	const screenshotDir = path.resolve('test-artifacts/photography-lightbox');
	await fs.mkdir(screenshotDir, { recursive: true });
	await page.screenshot({ path: path.join(screenshotDir, `photography-page-${testInfo.project.name}.png`), fullPage: true });

	const feature = await openLightbox(page, 'keyboard');
	await expectLightboxSettled(feature.dialog, feature.enlarged, 'landscape screenshot evidence should capture the settled lightbox');
	const lightboxSurface = await page.locator('.wp-lightbox-overlay').evaluate((node) => ({
		background: getComputedStyle(node).backgroundColor,
		pageBackground: getComputedStyle(document.body).backgroundColor,
	}));
	expect(lightboxSurface.background).toBe(lightboxSurface.pageBackground);
	expect(lightboxSurface.background).not.toBe('rgba(0, 0, 0, 0)');
	await page.screenshot({ path: path.join(screenshotDir, `lightbox-landscape-${testInfo.project.name}.png`), fullPage: false });
	await page.keyboard.press('Escape');
	await expect(feature.dialog).toBeHidden();
	await expect(feature.trigger).toBeFocused();

	// Re-enter the fixture after Core's closing transition so portrait evidence
	// starts from a fresh, keyboard-reachable document state.
	await openRasterPhotography(page);
	const portraitTrigger = page.locator('.browser-raster-gallery button.wp-lightbox-container, .browser-raster-gallery .wp-lightbox-container button').first();
	const portrait = await openLightbox(page, 'keyboard', portraitTrigger);
	await expect(portrait.enlarged).toBeVisible();
	await expectLightboxSettled(portrait.dialog, portrait.enlarged, 'portrait screenshot evidence should capture the settled lightbox');
	await page.screenshot({ path: path.join(screenshotDir, `lightbox-portrait-${testInfo.project.name}.png`), fullPage: false });
});


test('native WordPress Core Gallery can switch to the independent photo-sequence style', async ({ page }) => {
	await openRasterPhotography(page);
	const gallery = page.locator('#main-content .browser-raster-gallery');
	await expect(gallery).toBeVisible();
	// Use the real WordPress-rendered Gallery; exercise the independent block style.
	await gallery.evaluate((node) => {
		node.classList.remove('is-style-slateframe-contact-sheet');
		node.classList.add('is-style-slateframe-photo-sequence');
	});
	await expect(gallery).toHaveClass(/is-style-slateframe-photo-sequence/);
	const images = gallery.locator('img');
	await expect(images).toHaveCount(2);
	for (const img of await images.all()) {
		await img.scrollIntoViewIfNeeded();
		await expect.poll(() => img.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
	}
	const details = await gallery.evaluate((node) => ({
		display: getComputedStyle(node).display,
		columns: getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length,
		firstSpan: getComputedStyle(node.querySelector('figure.wp-block-image')).gridColumnEnd,
		captions: [...node.querySelectorAll('figcaption')].map((caption) => ({
			position: getComputedStyle(caption).position,
			shadow: getComputedStyle(caption).textShadow,
		})),
		images: [...node.querySelectorAll('img')].map((img) => ({
			alt: img.alt,
			fit: getComputedStyle(img).objectFit,
			aspect: getComputedStyle(img).aspectRatio,
		})),
	}));
	expect(details.display).toBe('grid');
	expect(details.columns).toBe(page.viewportSize().width <= 640 ? 1 : 2);
	if (page.viewportSize().width > 640) expect(details.firstSpan).toBe('-1');
	for (const caption of details.captions) {
		expect(caption.position).toBe('static');
		expect(caption.shadow).toBe('none');
	}
	for (const image of details.images) {
		expect(image.alt).toBeTruthy();
		expect(image.fit).toBe('contain');
		expect(image.aspect).toBe('auto');
	}
	await fs.mkdir(path.join('test-artifacts', 'photography-lightbox'), { recursive: true });
	await gallery.screenshot({
		path: path.join('test-artifacts', 'photography-lightbox', 'core-sequence-' + page.viewportSize().width + '.png'),
	});
});

test('native photo sequence preserves RTL and zoomed captions', async ({ page }) => {
	await openRasterPhotography(page);
	await page.evaluate(() => {
		document.documentElement.dir = 'rtl';
		document.documentElement.style.fontSize = '200%';
		const gallery = document.querySelector('.browser-raster-gallery');
		gallery.classList.remove('is-style-slateframe-contact-sheet');
		gallery.classList.add('is-style-slateframe-photo-sequence');
	});
	await expect(page.locator('.browser-raster-gallery figcaption')).toHaveCount(2);
	await expect.poll(() => page.evaluate(() =>
		document.documentElement.scrollWidth - document.documentElement.clientWidth
	)).toBeLessThanOrEqual(1);
});


test('real WordPress raster Gallery exercises sequence caption geometry at RTL 400% text', async ({ page }, testInfo) => {
  await openRasterPhotography(page);
  const gallery = page.locator('#main-content .browser-raster-gallery');
  await expect(gallery).toBeVisible();
  // Supplemental CSS contract on a real WordPress Gallery; separate serialized
  // native/class-only fixtures remain required for release acceptance.
  await gallery.evaluate(node => {
    node.classList.remove('is-style-slateframe-contact-sheet');
    node.classList.add('is-style-slateframe-photo-sequence');
  });
  const figure = gallery.locator(':scope > figure.wp-block-image').first();
  const image = figure.locator('img');
  await expect.poll(() => image.evaluate(n => n.complete && n.naturalWidth > 0)).toBe(true);
  const inspect = async label => {
    const m = await figure.evaluate(node => {
      const fig = node.getBoundingClientRect();
      const media = node.querySelector('img').getBoundingClientRect();
      const caption = node.querySelector('figcaption').getBoundingClientRect();
      return {figWidth:fig.width,mediaWidth:media.width,captionWidth:caption.width,
        mediaStart:media.left,captionStart:caption.left,
        mediaCenter:(media.left+media.right)/2,figCenter:(fig.left+fig.right)/2,
        captionHeight:caption.height,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    });
    expect(m.mediaWidth, label).toBeGreaterThan(0);
    expect(m.captionHeight, label).toBeGreaterThan(0);
    expect(Math.abs(m.captionWidth-m.figWidth), label).toBeLessThanOrEqual(4);
    if (label === 'normal') {
      expect(Math.abs(m.figWidth-m.mediaWidth), label).toBeLessThanOrEqual(4);
      expect(Math.abs(m.captionStart-m.mediaStart), label).toBeLessThanOrEqual(4);
    } else {
      // At 400% text sizing a 90px portrait must not force an unreadable
      // 90px caption. Allow the figure to widen while centering its media.
      expect(m.captionWidth, label).toBeGreaterThanOrEqual(
        Math.min(240, page.viewportSize().width - 24)
      );
      expect(Math.abs(m.mediaCenter-m.figCenter), label).toBeLessThanOrEqual(4);
    }
    expect(m.overflow, label).toBeLessThanOrEqual(1);
  };
  await inspect('normal');
  await figure.locator('figcaption').evaluate(node => {
    node.textContent = '日本語 العربية 中文 — Long caption that must stay attached to the portrait photograph instead of expanding to the grid track. '.repeat(3);
  });
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  await page.evaluate(() => {document.documentElement.dir='rtl';document.documentElement.style.fontSize='64px';});
  await inspect('RTL long caption 400%');
  if ([390,1440,1920].includes(projectWidth(testInfo))) {
    const dir=path.resolve('test-artifacts/photography-lightbox');
    await fs.mkdir(dir,{recursive:true});
    // The full-page capture must contain decoded media and the site footer.
    for (const img of await page.locator('#main-content img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate(n => n.complete && n.naturalWidth > 0)).toBe(true);
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.scrollTo(0, 0);
    });
    const footerBottom = await page.locator('footer').last().evaluate(
      el => el.getBoundingClientRect().bottom + window.scrollY
    );
    const screenshot = await page.screenshot({path:path.join(dir,`sequence-caption-rtl-zoom-${projectWidth(testInfo)}.png`),fullPage:true,animations:'disabled'});
    expect(footerBottom).toBeGreaterThan(0);
    expect(screenshot.readUInt32BE(16)).toBe(projectWidth(testInfo));
    expect(screenshot.readUInt32BE(20)).toBeGreaterThanOrEqual(Math.ceil(footerBottom)-2);
  }
});
