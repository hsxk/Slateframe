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
		const resolvedPx = (name) => {
			const probe = document.createElement('i');
			probe.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${name})`;
			document.body.append(probe);
			const value = Number.parseFloat(getComputedStyle(probe).inlineSize);
			probe.remove();
			return value;
		};
		const normal = document.querySelector('.browser-default-prose');
		const wide = document.querySelector('.browser-wide-block');
		const shell = document.querySelector('.slateframe-header-inner');
		const summary = document.querySelector('.browser-details summary');
		return {
			control: px('--slateframe-control'), spacing: Number.parseFloat(root.getPropertyValue('--slateframe-space-scale')),
			gutter: px('--slateframe-gutter-min'), section: Number.parseFloat(root.getPropertyValue('--slateframe-section-scale')),
			sectionMin: px('--slateframe-section-min'), sectionMax: px('--slateframe-section-max'), radius: px('--slateframe-radius'),
			content: px('--slateframe-content'), wide: px('--slateframe-wide'), chrome: px('--slateframe-chrome'), inlineGap: px('--slateframe-inline-gap'),
			space2: px('--slateframe-space-2'), space3: px('--slateframe-space-3'), space4: px('--slateframe-space-4'),
			presetXs: resolvedPx('--wp--preset--spacing--xs'), presetSm: resolvedPx('--wp--preset--spacing--sm'),
			presetMd: resolvedPx('--wp--preset--spacing--md'), presetLg: resolvedPx('--wp--preset--spacing--lg'),
			presetXl: resolvedPx('--wp--preset--spacing--xl'), preset2xl: resolvedPx('--wp--preset--spacing--2-xl'),
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
	near(metrics.radius, profile.radius); near(metrics.content, profile.content); near(metrics.wide, profile.wide); near(metrics.chrome, 1728);
	near(metrics.inlineGap, 4 * profile.spacing); near(metrics.componentGap, 12 * profile.spacing);
	near(metrics.space2, 8 * profile.spacing); near(metrics.space3, 12 * profile.spacing); near(metrics.space4, 16 * profile.spacing);
	near(metrics.presetXs, metrics.space2); near(metrics.presetSm, metrics.space3); near(metrics.presetMd, metrics.space4);
	near(metrics.presetLg, metrics.space4 * 1.5); near(metrics.presetXl, metrics.space4 * 2); near(metrics.preset2xl, metrics.space4 * 3);
	near(metrics.stackGap, 16 * profile.spacing); near(metrics.proseGap, 20 * profile.spacing);
	near(metrics.headingGap, 36 * profile.spacing); near(metrics.headingAfter, 10 * profile.spacing);
	near(metrics.listItemGap, 8 * profile.spacing); near(metrics.controlPaddingBlock, 8 * profile.spacing);
	near(metrics.controlPaddingInline, 12 * profile.spacing);
	expect(metrics.summaryHeight).toBeGreaterThanOrEqual(profile.control - 1);
	const gutter = Math.min(profile.gutter * 2, Math.max(profile.gutter, metrics.viewport * 0.03));
	const centeredChromeInset = Math.max(0, (metrics.viewport - metrics.chrome) / 2);
	near(metrics.shellInset, Math.max(gutter, centeredChromeInset), 1.5);
	expect(metrics.normalWidth).toBeLessThanOrEqual(Math.min(profile.content, metrics.viewport - (2 * gutter)) + 2);
	expect(metrics.wideWidth).toBeLessThanOrEqual(Math.min(profile.wide, metrics.viewport - (2 * gutter)) + 2);
	if (width(testInfo) === 1440) expect(metrics.wideWidth).toBeGreaterThan(metrics.normalWidth + 150);
	const compactNavigation = await page.locator('[data-site-header]').evaluate((node) => node.classList.contains('is-compact'));
	if (width(testInfo) <= 1280) expect(compactNavigation).toBe(true);
	const target = compactNavigation ? page.locator('[data-menu-toggle]') : page.locator('[data-primary-nav] a').first();
	await expect(target).toBeVisible();
	const targetBox = await target.boundingBox();
	expect(targetBox?.width || 0).toBeGreaterThanOrEqual(profile.control - 1);
	expect(targetBox?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
	await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });
	for (const locator of [page.locator('.slateframe-search-form input[type="search"]'), page.locator('.slateframe-search-form button')]) {
		await expect(locator).toBeVisible();
		expect((await locator.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
		near(await locator.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderRadius)), profile.radius, 1);
		near(await locator.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingInlineStart)), 12 * profile.spacing, 1);
	}
	await page.locator('.slateframe-main').evaluate((node) => {
		const fixture = document.createElement('div');
		fixture.className = 'browser-core-controls';
		fixture.innerHTML = '<form class="wp-block-search wp-block-search__button-outside"><div class="wp-block-search__inside-wrapper"><input class="wp-block-search__input" type="search" aria-label="Core search"><button class="wp-block-search__button wp-element-button" type="submit">Search</button></div></form><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#">Action</a></div>';
		node.prepend(fixture);
	});
	for (const locator of [
		page.locator('.browser-core-controls .wp-block-search__input'),
		page.locator('.browser-core-controls .wp-block-search__button'),
		page.locator('.browser-core-controls .wp-block-button__link'),
	]) {
		await expect(locator).toBeVisible();
		expect((await locator.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
		near(await locator.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderRadius)), profile.radius, 1);
		near(await locator.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingInlineStart)), 12 * profile.spacing, 1);
	}

	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const commentInput = page.locator('.slateframe-comments .comment-form-author input').first();
	const commentTextarea = page.locator('.slateframe-comments textarea').first();
	const commentSubmit = page.locator('.slateframe-comments .submit').first();
	await expect(commentInput).toBeVisible();
	await expect(commentTextarea).toBeVisible();
	await expect(commentSubmit).toBeVisible();
	expect((await commentInput.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
	expect((await commentSubmit.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
	const consentLabel = page.locator('.slateframe-comments .comment-form-cookies-consent label').first();
	await expect(consentLabel).toBeVisible();
	expect((await consentLabel.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
	for (const field of [commentInput, commentTextarea, commentSubmit]) {
		near(await field.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderRadius)), profile.radius, 1);
	}
	const footerPadding = await page.locator('.slateframe-site-footer').evaluate((node) =>
		Number.parseFloat(getComputedStyle(node).paddingBlockStart)
	);
	near(footerPadding, metrics.sectionMin, 1);
	const footerGap = await page.locator('.slateframe-footer-inner').evaluate((node) =>
		Number.parseFloat(getComputedStyle(node).gap)
	);
	near(footerGap, 32 * profile.spacing, 1);
	const footerLink = page.locator('.browser-footer-link');
	await expect(footerLink).toBeVisible();
	const footerLinkBox = await footerLink.boundingBox();
	expect(footerLinkBox?.width || 0).toBeGreaterThanOrEqual(profile.control - 1);
	expect(footerLinkBox?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
	const replyAction = page.locator('.slateframe-comment-list .reply a').first();
	await expect(replyAction).toBeVisible();
	const replyBox = await replyAction.boundingBox();
	expect(replyBox?.width || 0).toBeGreaterThanOrEqual(profile.control - 1);
	expect(replyBox?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);

	await page.goto('/', { waitUntil: 'networkidle' });
	const nativePagination = page.locator('.slateframe-pagination .page-numbers').first();
	await expect(nativePagination).toBeVisible();
	const nativePaginationGeometry = await nativePagination.evaluate((node) => {
		const box = node.getBoundingClientRect();
		const style = getComputedStyle(node);
		return {
			width: box.width,
			height: box.height,
			radius: Number.parseFloat(style.borderRadius),
			paddingBlock: Number.parseFloat(style.paddingBlockStart),
			paddingInline: Number.parseFloat(style.paddingInlineStart),
		};
	});
	expect(nativePaginationGeometry.width).toBeGreaterThanOrEqual(profile.control - 1);
	expect(nativePaginationGeometry.height).toBeGreaterThanOrEqual(profile.control - 1);
	near(nativePaginationGeometry.radius, profile.radius, 1);
	near(nativePaginationGeometry.paddingBlock, 8 * profile.spacing, 1);
	near(nativePaginationGeometry.paddingInline, 12 * profile.spacing, 1);

	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	const projectPagination = page.locator('.slateframe-project-grid .wp-block-query-pagination a').first();
	if (await projectPagination.count()) {
		expect((await projectPagination.boundingBox())?.height || 0).toBeGreaterThanOrEqual(profile.control - 1);
		near(await projectPagination.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderRadius)), profile.radius, 1);
		near(await projectPagination.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingBlockStart)), 8 * profile.spacing, 1);
		const paginationRhythm = await projectPagination.locator('xpath=../..').evaluate((node) => {
			const styles = getComputedStyle(node);
			return {
				gap: Number.parseFloat(styles.gap),
				marginStart: Number.parseFloat(styles.marginBlockStart),
				paddingStart: Number.parseFloat(styles.paddingBlockStart),
			};
		});
		near(paginationRhythm.gap, 4 * profile.spacing, 1);
		near(paginationRhythm.marginStart, 36 * profile.spacing, 1);
		near(paginationRhythm.paddingStart, 16 * profile.spacing, 1);
	}
});


test('appearance profile keeps native Photography lightbox inside the same control system', async ({ page }, testInfo) => {
	const photoPath = process.env.SLATEFRAME_PHOTO_PATH;
	test.skip(!photoPath, 'Photography fixture is required for Appearance lightbox coverage.');

	await page.goto(photoPath, { waitUntil: 'networkidle' });
	const caption = page.locator('.browser-photo-feature figcaption').first();
	await expect(caption).toBeVisible();
	await caption.evaluate((node) => {
		node.textContent = '中文摄影说明 日本語の長いキャプション العربية ' + 'portable-long-reference-token-'.repeat(10);
	});
	const captionMetrics = await caption.evaluate((node) => {
		const box = node.getBoundingClientRect();
		const style = getComputedStyle(node);
		return {
			left: box.left,
			right: box.right,
			viewport: document.documentElement.clientWidth,
			wrap: style.overflowWrap,
		};
	});
	expect(captionMetrics.left).toBeGreaterThanOrEqual(-1);
	expect(captionMetrics.right).toBeLessThanOrEqual(captionMetrics.viewport + 1);
	expect(captionMetrics.wrap).toBe('anywhere');
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

	const trigger = page.locator('#main-content button.wp-lightbox-container, #main-content .wp-lightbox-container button').first();
	await expect(trigger).toBeVisible();
	await trigger.focus();
	await page.keyboard.press('Enter');
	const dialog = page.locator('[role="dialog"]').last();
	await expect(dialog).toBeVisible();
	const close = dialog.getByRole('button', { name: /close/i });
	await expect(close).toBeVisible();

	const geometry = await close.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		const style = getComputedStyle(node);
		const root = getComputedStyle(document.documentElement);
		const probe = document.createElement('i');
		probe.style.cssText = 'position:absolute;visibility:hidden;inline-size:var(--slateframe-component-gap)';
		document.body.append(probe);
		const componentGap = Number.parseFloat(getComputedStyle(probe).inlineSize);
		probe.remove();
		return {
			width: rect.width,
			height: rect.height,
			left: rect.left,
			right: rect.right,
			top: rect.top,
			bottom: rect.bottom,
			viewportWidth: document.documentElement.clientWidth,
			viewportHeight: innerHeight,
			radius: Number.parseFloat(style.borderRadius),
			boxSizing: style.boxSizing,
			display: style.display,
			paddingBlockStart: Number.parseFloat(style.paddingBlockStart),
			marginBlockStart: Number.parseFloat(style.marginBlockStart),
			marginInlineEnd: Number.parseFloat(style.marginInlineEnd),
			componentGap,
			control: Number.parseFloat(root.getPropertyValue('--slateframe-control')),
		};
	});
	expect(geometry.width).toBeGreaterThanOrEqual(profile.control - 1);
	expect(geometry.height).toBeGreaterThanOrEqual(profile.control - 1);
	near(geometry.control, profile.control, 1);
	near(geometry.radius, profile.radius, 1);
	expect(geometry.boxSizing).toBe('border-box');
	expect(geometry.display).toBe('grid');
	expect(geometry.paddingBlockStart).toBe(0);
	expect(geometry.marginBlockStart).toBeGreaterThanOrEqual(geometry.componentGap - 1);
	expect(geometry.marginInlineEnd).toBeGreaterThanOrEqual(geometry.componentGap - 1);
	expect(geometry.left).toBeGreaterThanOrEqual(-1);
	expect(geometry.top).toBeGreaterThanOrEqual(-1);
	expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
	expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	await page.screenshot({
		path: path.join(screenshotDir, 'appearance-' + profileName + '-' + testInfo.project.name + '-photography-lightbox.png'),
		fullPage: false,
	});

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('appearance profile stays contained across content modes and captures review evidence', async ({ page }, testInfo) => {
	const routes = [['home-controls', '/'], ['search-controls', '/?s=Portable'], ['page', pagePath], ['showcase', showcasePath], ['photography', process.env.SLATEFRAME_PHOTO_PATH],
		['portfolio', process.env.SLATEFRAME_PROJECT_PATH], ['knowledge', process.env.SLATEFRAME_KNOWLEDGE_PATH]].filter(([, route]) => route);
	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	for (const [name, route] of routes) {
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
			`${profileName} profile overflow on ${name}`).toBeLessThanOrEqual(1);
		if (name === 'photography') {
			const photographyRhythm = await page.evaluate(() => {
				const resolveTokenPixels = (token) => {
					const probe = document.createElement('span');
					probe.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${token});`;
					document.body.append(probe);
					const value = Number.parseFloat(getComputedStyle(probe).inlineSize);
					probe.remove();
					return value;
				};
				const gallery = document.querySelector('.is-style-slateframe-contact-sheet');
				const caption = gallery?.querySelector('figcaption');
				const diptych = document.querySelector('.is-style-slateframe-diptych');
				return {
					mediaGap: resolveTokenPixels('--slateframe-media-gap'),
					galleryGap: gallery ? Number.parseFloat(getComputedStyle(gallery).gap) : 0,
					diptychGap: diptych ? Number.parseFloat(getComputedStyle(diptych).gap) : 0,
					captionGap: resolveTokenPixels('--slateframe-caption-gap'),
					captionPadding: caption ? Number.parseFloat(getComputedStyle(caption).paddingBlockStart) : 0,
				};
			});
			near(photographyRhythm.galleryGap, photographyRhythm.mediaGap, 1);
			near(photographyRhythm.diptychGap, photographyRhythm.mediaGap, 1);
			near(photographyRhythm.captionPadding, photographyRhythm.captionGap, 1);
			const photographyGeometry = await page.locator('#main-content').evaluate((main) => {
				const images = [...main.querySelectorAll('.is-style-slateframe-contact-sheet img, .is-style-slateframe-diptych img, .slateframe-gallery-sequence img, .is-style-slateframe-photo-feature img')];
				return images.map((image) => {
					const box = image.getBoundingClientRect();
					return {
						left: box.left,
						right: box.right,
						width: box.width,
						viewport: document.documentElement.clientWidth,
						objectFit: getComputedStyle(image).objectFit,
					};
				});
			});
			expect(photographyGeometry.length).toBeGreaterThan(0);
			for (const image of photographyGeometry) {
				expect(image.width).toBeGreaterThan(0);
				expect(image.left).toBeGreaterThanOrEqual(-1);
				expect(image.right).toBeLessThanOrEqual(image.viewport + 1);
				expect(['contain', 'fill']).toContain(image.objectFit);
			}
		}
		await page.screenshot({ path: path.join(screenshotDir, `appearance-${profileName}-${testInfo.project.name}-${name}.png`), fullPage: true });
	}
});
