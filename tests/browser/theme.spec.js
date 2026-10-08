const fs = require('node:fs/promises');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const photoPath = process.env.SLATEFRAME_PHOTO_PATH || pagePath;
const projectPath = process.env.SLATEFRAME_PROJECT_PATH || pagePath;
const knowledgePath = process.env.SLATEFRAME_KNOWLEDGE_PATH || pagePath;
const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || pagePath;
const featuredPagePath = process.env.SLATEFRAME_FEATURED_PAGE_PATH || pagePath;
const attachmentPath = process.env.SLATEFRAME_ATTACHMENT_PATH || pagePath;
const untitledPostPath = process.env.SLATEFRAME_UNTITLED_POST_PATH || postPath;

function projectWidth(testInfo) {
	return testInfo.project.use.viewport?.width || 1440;
}

async function useShortDesktopNavigation(page) {
	await page.locator('[data-primary-nav] > ul > li > a').evaluateAll((links) =>
		links.forEach((link, index) => { link.textContent = `Nav ${index + 1}`; })
	);
	await page.locator('.slateframe-language-slot a').evaluateAll((links) =>
		links.forEach((link, index) => { link.textContent = index ? 'JA' : 'EN'; })
	);
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
	const routes = ['/', postPath, pagePath, featuredPagePath, attachmentPath, untitledPostPath, photoPath, projectPath, knowledgePath, showcasePath, '/?s=Slateframe', '/slateframe-browser-missing/'];

	for (const route of routes) {
		failures.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		await expect(page.locator('#main-content')).toBeVisible();
		await expectNoHorizontalOverflow(page, route);
		expect(failures, `runtime failures on ${route}`).toEqual([]);
	}
});

test('form presentation stays contextual instead of leaking into form-free routes', async ({ page }) => {
	const assetCount = async (name) => page.locator(`link[rel="stylesheet"][href*="/assets/css/${name}.css"]`).count();

	await page.goto('/', { waitUntil: 'networkidle' });
	expect(await assetCount('forms')).toBe(0);
	expect(await assetCount('form-content')).toBe(0);
	expect(await assetCount('search-form')).toBe(0);

	await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });
	expect(await assetCount('forms')).toBe(1);
	expect(await assetCount('search-form')).toBe(1);
	expect(await assetCount('form-content')).toBe(0);

	await page.goto(pagePath, { waitUntil: 'networkidle' });
	expect(await assetCount('forms')).toBe(1);
	expect(await assetCount('form-content')).toBe(1);
	expect(await assetCount('search-form')).toBe(0);

	await page.goto(photoPath, { waitUntil: 'networkidle' });
	expect(await assetCount('forms')).toBe(0);
	expect(await assetCount('form-content')).toBe(0);
	expect(await assetCount('search-form')).toBe(0);
});

test('semantic forms and editorial primitives stay usable across responsive viewports', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const form = page.locator('.browser-semantic-form');
	await expect(form).toBeVisible();
	const name = page.locator('#browser-display-name');
	const email = page.locator('#browser-email');
	await name.focus();
	await expect(name).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(email).toBeFocused();
	await expect(email).toHaveAttribute('aria-invalid', 'true');
	const imageSubmit = page.locator('#browser-image-submit');
	await expect(imageSubmit).toHaveAttribute('type', 'image');
	await expect(imageSubmit).toHaveAttribute('alt', 'Submit image');
	const imageButtonGeometry = await imageSubmit.evaluate((node) => {
		const box = node.getBoundingClientRect();
		const style = getComputedStyle(node);
		return { width: box.width, height: box.height, padding: Number.parseFloat(style.paddingInlineStart) };
	});
	expect(imageButtonGeometry.width).toBeGreaterThanOrEqual(44);
	expect(imageButtonGeometry.width).toBeLessThanOrEqual(72);
	expect(imageButtonGeometry.height).toBeGreaterThanOrEqual(44);
	expect(imageButtonGeometry.height).toBeLessThanOrEqual(60);
	expect(imageButtonGeometry.padding).toBeLessThanOrEqual(1);
	await imageSubmit.focus();
	await expect(imageSubmit).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(page.locator('#browser-form-action')).toBeFocused();
	await expect(page.locator('#browser-notes')).toHaveAttribute('dir', 'rtl');
	const action = page.locator('#browser-form-action');
	const actionBox = await action.boundingBox();
	expect(actionBox?.width || 0).toBeGreaterThanOrEqual(44);
	expect(actionBox?.height || 0).toBeGreaterThanOrEqual(44);
	for (const primitive of ['kbd', 'mark', 'abbr[title]']) {
		await expect(page.locator('.browser-editorial-primitives').locator(primitive)).toBeVisible();
	}
	await expectNoHorizontalOverflow(page, 'semantic form fixture');
	await page.emulateMedia({ forcedColors: 'active' });
	expect(await email.evaluate((node) => getComputedStyle(node).borderStyle)).toBe('double');
	await expectNoHorizontalOverflow(page, 'semantic form fixture in forced colors');
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

test('short mobile site identity and header controls share one aligned row', async ({ page }, testInfo) => {
	test.skip(![320, 375, 390, 412].includes(projectWidth(testInfo)), 'Mobile identity is checked at each phone viewport.');
	await page.goto('/', { waitUntil: 'networkidle' });
	const brand = page.locator('.slateframe-brand');
	const color = page.locator('[data-color-toggle]');
	const menu = page.locator('[data-menu-toggle]');
	for (const control of [brand, color, menu]) await expect(control).toBeVisible();
	const [brandBox, colorBox, menuBox] = await Promise.all([brand.boundingBox(), color.boundingBox(), menu.boundingBox()]);
	const center = (box) => box.y + box.height / 2;
	expect(Math.abs(center(brandBox) - center(colorBox))).toBeLessThanOrEqual(5);
	expect(Math.abs(center(menuBox) - center(colorBox))).toBeLessThanOrEqual(5);
	expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(colorBox.x + 1);
	expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(projectWidth(testInfo) + 1);
	await expectNoHorizontalOverflow(page, 'mobile inline header');
	if ([320, 390].includes(projectWidth(testInfo))) {
		const dir = path.resolve('test-artifacts/screenshots');
		await fs.mkdir(dir, { recursive: true });
		await page.locator('[data-site-header]').screenshot({ path: path.join(dir, `mobile-header-inline-${testInfo.project.name}.png`) });
	}
});

test('responsive navigation remains operable', async ({ page }, testInfo) => {
	const failures = watchRuntime(page);
	await page.goto('/', { waitUntil: 'networkidle' });

	const toggle = page.locator('[data-menu-toggle]');
	const header = page.locator('[data-site-header]');
	const compact = await header.evaluate((node) => node.classList.contains('is-compact'));

	if (projectWidth(testInfo) <= 1280) {
		expect(compact).toBe(true);
	}

	if (compact) {
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
		const topLevelLinks = page.locator('[data-primary-nav] > ul > li > a');
		for (let index = 0; index < await topLevelLinks.count(); index += 1) {
			const clipped = await topLevelLinks.nth(index).evaluate((link) => link.scrollWidth > link.clientWidth + 1);
			expect(clipped, 'desktop navigation labels must not be ellipsized').toBe(false);
		}
	}

	await expectNoHorizontalOverflow(page, '/');
	expect(failures).toEqual([]);
});


test('site identity reflows without truncating multilingual text', async ({ page }, testInfo) => {
	test.skip(![320, 375, 390, 412, 768, 1440, 1920].includes(projectWidth(testInfo)), 'Site-identity reflow covers every responsive evidence viewport.');
	await page.goto('/', { waitUntil: 'networkidle' });

	const title = page.locator('.slateframe-brand-title');
	const tagline = page.locator('.slateframe-brand-tagline');
	await title.evaluate((node) => {
		node.textContent = 'Slateframe 可迁移的发布框架 日本語の長いサイト名 العربية ' + 'portable-site-identity-'.repeat(4);
	});
	if (await tagline.count()) {
		await tagline.evaluate((node) => {
			node.textContent = 'Publishing / 摄影 / 写真 / المعرفة — ' + 'portable-tagline-context-'.repeat(4);
		});
	}
	await page.locator('html').evaluate((node) => { node.style.fontSize = '200%'; });

	const titleMetrics = await title.evaluate((node) => {
		const style = getComputedStyle(node);
		const box = node.getBoundingClientRect();
		return {
			whiteSpace: style.whiteSpace,
			textOverflow: style.textOverflow,
			overflow: style.overflow,
			scrollWidth: node.scrollWidth,
			clientWidth: node.clientWidth,
			scrollHeight: node.scrollHeight,
			clientHeight: node.clientHeight,
			left: box.left,
			right: box.right,
			viewport: document.documentElement.clientWidth,
		};
	});
	expect(titleMetrics.whiteSpace).not.toBe('nowrap');
	expect(titleMetrics.textOverflow).not.toBe('ellipsis');
	expect(titleMetrics.overflow).not.toBe('hidden');
	expect(titleMetrics.scrollWidth).toBeLessThanOrEqual(titleMetrics.clientWidth + 1);
	expect(titleMetrics.scrollHeight).toBeLessThanOrEqual(titleMetrics.clientHeight + 1);
	expect(titleMetrics.left).toBeGreaterThanOrEqual(-1);
	expect(titleMetrics.right).toBeLessThanOrEqual(titleMetrics.viewport + 1);

	if (await tagline.isVisible()) {
		const taglineMetrics = await tagline.evaluate((node) => {
			const style = getComputedStyle(node);
			return {
				whiteSpace: style.whiteSpace,
				textOverflow: style.textOverflow,
				overflow: style.overflow,
				scrollWidth: node.scrollWidth,
				clientWidth: node.clientWidth,
				scrollHeight: node.scrollHeight,
				clientHeight: node.clientHeight,
			};
		});
		expect(taglineMetrics.whiteSpace).not.toBe('nowrap');
		expect(taglineMetrics.textOverflow).not.toBe('ellipsis');
		expect(taglineMetrics.overflow).not.toBe('hidden');
		expect(taglineMetrics.scrollWidth).toBeLessThanOrEqual(taglineMetrics.clientWidth + 1);
		expect(taglineMetrics.scrollHeight).toBeLessThanOrEqual(taglineMetrics.clientHeight + 1);
	}

	for (const control of [page.locator('[data-color-toggle]'), page.locator('[data-menu-toggle]')]) {
		await expect(control).toBeVisible();
		const box = await control.boundingBox();
		expect(box?.x ?? -1).toBeGreaterThanOrEqual(-1);
		expect((box?.x ?? Infinity) + (box?.width ?? 0)).toBeLessThanOrEqual(projectWidth(testInfo) + 1);
	}

	if (projectWidth(testInfo) <= 480) {
		const geometry = await page.evaluate(() => {
			const header = document.querySelector('[data-site-header]');
			const brand = document.querySelector('.slateframe-brand');
			const color = document.querySelector('[data-color-toggle]');
			const menu = document.querySelector('[data-menu-toggle]');
			const main = document.querySelector('#main-content');
			const headerBox = header.getBoundingClientRect();
			const brandBox = brand.getBoundingClientRect();
			const colorBox = color.getBoundingClientRect();
			const menuBox = menu.getBoundingClientRect();
			const mainBox = main.getBoundingClientRect();
			return {
				position: getComputedStyle(header).position,
				headerBottom: headerBox.bottom,
				brandBottom: brandBox.bottom,
				controlsTop: Math.min(colorBox.top, menuBox.top),
				controlsAlignment: Math.abs(colorBox.top - menuBox.top),
				controlsHeightDifference: Math.abs(colorBox.height - menuBox.height),
				controlsOrder: menuBox.left - colorBox.right,
				controlsGap: Math.min(colorBox.top, menuBox.top) - brandBox.bottom,
				mainTop: mainBox.top,
				viewportHeight: innerHeight,
			};
		});
		expect(geometry.position).toBe('relative');
		expect(geometry.brandBottom).toBeLessThanOrEqual(geometry.controlsTop + 1);
		expect(geometry.controlsAlignment).toBeLessThanOrEqual(1);
		expect(geometry.controlsHeightDifference, 'color and menu controls share the same 200%-zoom control height').toBeLessThanOrEqual(1);
		expect(geometry.controlsOrder).toBeGreaterThanOrEqual(-1);
		expect(geometry.controlsGap).toBeLessThanOrEqual(48);
		expect(geometry.mainTop).toBeGreaterThanOrEqual(geometry.headerBottom - 1);
		expect(geometry.viewportHeight).toBeGreaterThan(0);

		const toggle = page.locator('[data-menu-toggle]');
		const nav = page.locator('[data-primary-nav]');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(nav).toBeVisible();
		await expect(nav).not.toHaveAttribute('inert', '');
		await expect(nav.locator('a:visible').first()).toBeFocused();
		const navGeometry = await nav.evaluate((node) => {
			const rect = node.getBoundingClientRect();
			return { top: rect.top, height: rect.height, viewportHeight: innerHeight };
		});
		expect(navGeometry.height).toBeGreaterThan(0);
		expect(navGeometry.top).toBeGreaterThanOrEqual(-1);
		const screenshotDir = path.resolve('test-artifacts/screenshots');
		await fs.mkdir(screenshotDir, { recursive: true });
		await page.screenshot({
			path: path.join(screenshotDir, testInfo.project.name + '-site-identity-menu-reflow.png'),
			fullPage: false,
		});
		await page.keyboard.press('Escape');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	}
	await expectNoHorizontalOverflow(page, '/?site-identity-reflow=200-percent');

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	await page.locator('[data-site-header]').screenshot({
		path: path.join(screenshotDir, testInfo.project.name + '-site-identity-reflow.png'),
	});
});

test('200% text enlargement keeps core content modes contained', async ({ page }, testInfo) => {
	test.skip(projectWidth(testInfo) !== 320, 'The narrowest viewport is the strongest text-resize containment fixture.');
	const routes = ['/', '/?s=Portable', pagePath, photoPath, projectPath, knowledgePath, showcasePath];

	for (const route of routes) {
		await page.goto(route, { waitUntil: 'networkidle' });
		await page.locator('html').evaluate((node) => { node.style.fontSize = '200%'; });
		await expectNoHorizontalOverflow(page, route + '#text-resize-200');
	}

	await page.goto(knowledgePath, { waitUntil: 'networkidle' });
	await page.locator('html').evaluate((node) => {
		node.style.fontSize = '200%';
		node.dir = 'rtl';
	});
	await expectNoHorizontalOverflow(page, knowledgePath + '#rtl-text-resize-200');

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	for (const [name, route] of [['home', '/'], ['portfolio', projectPath], ['knowledge-rtl', knowledgePath]]) {
		await page.goto(route, { waitUntil: 'networkidle' });
		await page.locator('html').evaluate((node, rtl) => {
			node.style.fontSize = '200%';
			if (rtl) node.dir = 'rtl';
		}, name === 'knowledge-rtl');
		await page.screenshot({
			path: path.join(screenshotDir, `viewport-320-text-resize-${name}.png`),
			fullPage: true,
		});
	}
});

test('adaptive desktop navigation responds to translated label growth and recovery', async ({ page }, testInfo) => {
	test.skip(projectWidth(testInfo) !== 1920, 'Translated growth/recovery is sampled on the widest desktop fixture; narrower desktops may already need compact navigation.');

	await page.goto('/', { waitUntil: 'networkidle' });

	const header = page.locator('[data-site-header]');
	const toggle = page.locator('[data-menu-toggle]');
	const firstLink = page.locator('[data-primary-nav] > ul > li > a').first();
	await useShortDesktopNavigation(page);
	await expect(header).not.toHaveClass(/is-compact/);
	await expect(toggle).toBeHidden();

	const languageLink = page.locator('.slateframe-language-slot a').first();
	const original = await firstLink.textContent();
	const originalLanguage = await languageLink.textContent();
	await firstLink.evaluate((link) => {
		link.textContent = 'Außergewöhnlich lange übersetzte Navigationsbezeichnung 中文 العربية 日本語 — portable multilingual navigation';
	});

	// A long translation that still fits the 92rem header shell should stay in
	// the wide presentation instead of collapsing merely because it is long.
	await expect(header).not.toHaveClass(/is-compact/);
	await expect(toggle).toBeHidden();
	await expect(page.locator('[data-primary-nav]')).not.toHaveAttribute('inert', '');
	await expectNoHorizontalOverflow(page, '/');

	// Combined menu + language growth must cross the real inline-space boundary
	// and use the same accessible compact navigation rather than wrap or clip.
	await languageLink.evaluate((link) => {
		link.textContent = 'Deutsch 日本語 العربية 中文 — exceptionally long language destination — français português 한국어';
	});
	await expect(header).toHaveClass(/is-compact/);
	await expect(toggle).toBeVisible();
	await expect(page.locator('[data-primary-nav]')).toHaveAttribute('inert', '');
	await expectNoHorizontalOverflow(page, '/');
	expect(await page.locator('[data-primary-nav]').evaluate((node) => node.style.whiteSpace)).toBe('');

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	await page.screenshot({
		path: path.join(screenshotDir, `${testInfo.project.name}-translated-nav-compact.png`),
		fullPage: false,
	});

	await firstLink.evaluate((link, label) => {
		link.textContent = label;
	}, original);
	await languageLink.evaluate((link, label) => {
		link.textContent = label;
	}, originalLanguage);
	await expect(header).not.toHaveClass(/is-compact/);
	await expect(toggle).toBeHidden();
	await expect(page.locator('[data-primary-nav]')).not.toHaveAttribute('inert', '');
	await expectNoHorizontalOverflow(page, '/');
	await page.screenshot({
		path: path.join(screenshotDir, `${testInfo.project.name}-translated-nav-recovered.png`),
		fullPage: false,
	});
});

test('tablet and compact desktop navigation share one operable breakpoint', async ({ page }) => {
	await page.setViewportSize({ width: 1024, height: 768 });
	await page.goto('/', { waitUntil: 'networkidle' });

	const toggle = page.locator('[data-menu-toggle]');
	const nav = page.locator('[data-primary-nav]');
	await expect(toggle).toBeVisible();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(nav).toHaveAttribute('inert', '');

	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await expect(nav).not.toHaveAttribute('inert', '');
	await expect(nav.locator('a:visible').first()).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(nav).toHaveAttribute('inert', '');
	await expect(toggle).toBeFocused();
	await expectNoHorizontalOverflow(page, '/');
});

test('spatial tokens keep interactive controls coherent and accessible', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	const tokens = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		return {
			control: Number.parseFloat(root.getPropertyValue('--slateframe-control')),
			gutter: Number.parseFloat(root.getPropertyValue('--slateframe-gutter-min')),
			radius: Number.parseFloat(root.getPropertyValue('--slateframe-radius')),
			spacing: Number.parseFloat(root.getPropertyValue('--slateframe-space-scale')),
			section: Number.parseFloat(root.getPropertyValue('--slateframe-section-scale')),
		};
	});
	expect(tokens.control).toBeGreaterThanOrEqual(44);
	expect(tokens.gutter).toBeGreaterThanOrEqual(12);
	expect(tokens.radius).toBeGreaterThanOrEqual(0);
	expect(tokens.spacing).toBeGreaterThanOrEqual(0.85);
	expect(tokens.section).toBeGreaterThanOrEqual(0.8);

	const targets = page.locator('.slateframe-primary-nav a:visible, [data-menu-toggle]:visible');
	for (let index = 0; index < await targets.count(); index += 1) {
		const box = await targets.nth(index).boundingBox();
		expect(box?.width || 0).toBeGreaterThanOrEqual(44);
		expect(box?.height || 0).toBeGreaterThanOrEqual(44);
	}
});


test('native archive pagination inherits the shared control family', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	const pagination = page.locator('.slateframe-pagination');
	await expect(pagination).toBeVisible();
	const controls = pagination.locator('.page-numbers');
	expect(await controls.count()).toBeGreaterThan(1);

	const tokens = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		const probe = document.createElement('i');
		probe.style.cssText = 'position:absolute;visibility:hidden;padding-inline-start:var(--slateframe-control-padding-inline)';
		document.body.append(probe);
		const paddingInline = Number.parseFloat(getComputedStyle(probe).paddingInlineStart);
		probe.remove();
		return {
			control: Number.parseFloat(root.getPropertyValue('--slateframe-control')),
			radius: Number.parseFloat(root.getPropertyValue('--slateframe-radius')),
			paddingInline,
		};
	});

	for (let index = 0; index < await controls.count(); index += 1) {
		const control = controls.nth(index);
		if (!await control.isVisible()) continue;
		const geometry = await control.evaluate((node) => {
			const box = node.getBoundingClientRect();
			const style = getComputedStyle(node);
			return {
				width: box.width,
				height: box.height,
				radius: Number.parseFloat(style.borderRadius),
				paddingInline: Number.parseFloat(style.paddingInlineStart),
				wrap: style.overflowWrap,
			};
		});
		expect(geometry.width).toBeGreaterThanOrEqual(tokens.control - 1);
		expect(geometry.height).toBeGreaterThanOrEqual(tokens.control - 1);
		expect(Math.abs(geometry.radius - tokens.radius)).toBeLessThanOrEqual(1);
		expect(Math.abs(geometry.paddingInline - tokens.paddingInline)).toBeLessThanOrEqual(1);
		expect(geometry.wrap).toBe('anywhere');
	}

	const next = pagination.locator('.next.page-numbers').first();
	if (await next.count()) {
		await next.evaluate((node) => {
			node.textContent = '下一页 日本語 العربية ' + 'portable-pagination-token-'.repeat(10);
		});
	}
	await expectNoHorizontalOverflow(page, '/');

	await page.locator('html').evaluate((node) => { node.dir = 'rtl'; });
	await expectNoHorizontalOverflow(page, '/?rtl-pagination-fixture=1');
});

test('translated search and footer actions stay contained inside shared controls', async ({ page }) => {
	await page.goto('/?s=Portable', { waitUntil: 'networkidle' });
	const searchButton = page.locator('.slateframe-search-form button').first();
	await expect(searchButton).toBeVisible();
	await searchButton.evaluate((node) => {
		node.textContent = '搜索 搜尋 検索 العربية ' + 'portable-search-action-'.repeat(10);
	});
	const searchGeometry = await searchButton.evaluate((node) => {
		const box = node.getBoundingClientRect();
		return {
			width: box.width,
			height: box.height,
			viewport: document.documentElement.clientWidth,
			right: box.right,
			wrap: getComputedStyle(node).overflowWrap,
		};
	});
	expect(searchGeometry.width).toBeGreaterThanOrEqual(44);
	expect(searchGeometry.height).toBeGreaterThanOrEqual(44);
	expect(searchGeometry.right).toBeLessThanOrEqual(searchGeometry.viewport + 1);
	expect(searchGeometry.wrap).toBe('anywhere');
	await expectNoHorizontalOverflow(page, '/?s=Portable');

	const footerLink = page.locator('.browser-footer-link').first();
	await expect(footerLink).toBeVisible();
	await footerLink.evaluate((node) => {
		node.textContent = 'Browse archive / 归档 / アーカイブ / الأرشيف ' + 'portable-footer-link-'.repeat(10);
	});
	const footerBox = await footerLink.boundingBox();
	expect(footerBox?.width || 0).toBeGreaterThanOrEqual(44);
	expect(footerBox?.height || 0).toBeGreaterThanOrEqual(44);
	await expectNoHorizontalOverflow(page, '/?s=Portable#footer-control-fixture');
});

test('comment reply and cancel actions keep complete touch targets', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const reply = page.locator('.slateframe-comment-list .reply a').first();
	await expect(reply).toBeVisible();
	const replyBox = await reply.boundingBox();
	expect(replyBox?.width || 0).toBeGreaterThanOrEqual(44);
	expect(replyBox?.height || 0).toBeGreaterThanOrEqual(44);

	await reply.click();
	const cancel = page.locator('#cancel-comment-reply-link');
	await expect(cancel).toBeVisible();
	const cancelBox = await cancel.boundingBox();
	expect(cancelBox?.width || 0).toBeGreaterThanOrEqual(44);
	expect(cancelBox?.height || 0).toBeGreaterThanOrEqual(44);
	await cancel.evaluate((node) => {
		node.textContent = '取消回复 返信をキャンセル إلغاء الرد ' + 'portable-comment-action-'.repeat(8);
	});
	await expectNoHorizontalOverflow(page, pagePath + '#respond');
});

test('threaded comment replies load only on singular discussions', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	await expect(page.locator('#comment-reply-js')).toHaveCount(1);

	await page.goto('/', { waitUntil: 'networkidle' });
	await expect(page.locator('#comment-reply-js')).toHaveCount(0);
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
	await expect(page.locator('.browser-lead')).toBeVisible();
	await expect(page.locator('.browser-toc')).toBeVisible();
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
	const fullChildBounds = await page.locator('.browser-full-block > p').evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return {
			left: rect.left,
			right: rect.right,
			viewport: document.documentElement.clientWidth,
		};
	});
	expect(fullChildBounds.left).toBeGreaterThanOrEqual(12);
	expect(fullChildBounds.right).toBeLessThanOrEqual(fullChildBounds.viewport - 12);

	await expectNoHorizontalOverflow(page, pagePath);
});

test('Core table scroll regions stay on the reading axis and expose keyboard focus', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const table = page.locator('.browser-data-table');
	await expect(table).toBeVisible();
	await expect(table).toHaveAttribute('tabindex', '0');

	await table.focus();
	await expect(table).toBeFocused();

	const geometry = await page.evaluate(() => {
		const tableBlock = document.querySelector('.browser-data-table');
		const prose = document.querySelector('.browser-default-prose');
		if (!tableBlock || !prose) {
			throw new Error('Table-axis fixtures are missing.');
		}
		const tableRect = tableBlock.getBoundingClientRect();
		const proseRect = prose.getBoundingClientRect();
		const styles = getComputedStyle(tableBlock);
		return {
			tableLeft: tableRect.left,
			tableWidth: tableRect.width,
			proseLeft: proseRect.left,
			proseWidth: proseRect.width,
			outlineStyle: styles.outlineStyle,
			outlineWidth: Number.parseFloat(styles.outlineWidth),
		};
	});

	expect(Math.abs(geometry.tableLeft - geometry.proseLeft)).toBeLessThanOrEqual(1);
	expect(Math.abs(geometry.tableWidth - geometry.proseWidth)).toBeLessThanOrEqual(1);
	expect(geometry.outlineStyle).not.toBe('none');
	expect(geometry.outlineWidth).toBeGreaterThanOrEqual(2);
	await expectNoHorizontalOverflow(page, pagePath);
});

test('editorial reading rhythm distinguishes headings, nested lists, code, tables, and quotes', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const rhythm = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		const h2 = document.querySelector('.browser-reading-h2');
		const h3 = document.querySelector('.browser-reading-h3');
		const h4 = document.querySelector('.browser-reading-h4');
		const h5 = document.querySelector('.browser-reading-h5');
		const h6 = document.querySelector('.browser-reading-h6');
		const definition = document.querySelector('.browser-definition-list');
		const term = definition.querySelector('dt');
		const description = definition.querySelector('dd');
		const separator = document.querySelector('.browser-reading-separator');
		const nested = document.querySelector('.browser-nested-list li > ul');
		const code = document.querySelector('.wp-block-code');
		const th = document.querySelector('.browser-data-table th');
		const h2Styles = getComputedStyle(h2);
		const probe = document.createElement('div');
		probe.style.position = 'absolute';
		probe.style.visibility = 'hidden';
		document.body.append(probe);
		const tokenPixels = (property) => {
			probe.style.marginBlockStart = `var(${property})`;
			return Number.parseFloat(getComputedStyle(probe).marginBlockStart);
		};
		const codeStyles = getComputedStyle(code);
		const thStyles = getComputedStyle(th);
		return {
			proseGap: tokenPixels('--slateframe-prose-gap'),
			headingGap: tokenPixels('--slateframe-heading-gap'),
			headingAfter: tokenPixels('--slateframe-heading-after'),
			listGap: tokenPixels('--slateframe-list-item-gap'),
			stackGap: tokenPixels('--slateframe-stack-gap'),
			space3: tokenPixels('--slateframe-space-3'),
			h2Size: Number.parseFloat(h2Styles.fontSize),
			h3Size: Number.parseFloat(getComputedStyle(h3).fontSize),
			h4Size: Number.parseFloat(getComputedStyle(h4).fontSize),
			h5Size: Number.parseFloat(getComputedStyle(h5).fontSize),
			h6Size: Number.parseFloat(getComputedStyle(h6).fontSize),
			h4MarginStart: Number.parseFloat(getComputedStyle(h4).marginBlockStart),
			h5MarginStart: Number.parseFloat(getComputedStyle(h5).marginBlockStart),
			h6MarginStart: Number.parseFloat(getComputedStyle(h6).marginBlockStart),
			definitionDisplay: getComputedStyle(definition).display,
			definitionGap: Number.parseFloat(getComputedStyle(definition).gap),
			termWeight: Number.parseFloat(getComputedStyle(term).fontWeight),
			descriptionInset: Number.parseFloat(getComputedStyle(description).marginInlineStart),
			separatorMargin: Number.parseFloat(getComputedStyle(separator).marginBlockStart),
			separatorBorder: Number.parseFloat(getComputedStyle(separator).borderBlockStartWidth),
			h2MarginStart: Number.parseFloat(h2Styles.marginBlockStart),
			h2MarginEnd: Number.parseFloat(h2Styles.marginBlockEnd),
			nestedGap: Number.parseFloat(getComputedStyle(nested).marginBlockStart),
			codeLineHeight: Number.parseFloat(codeStyles.lineHeight),
			codePaddingBlock: Number.parseFloat(codeStyles.paddingBlockStart),
			codePaddingInline: Number.parseFloat(codeStyles.paddingInlineStart),
			tableCellPadding: Number.parseFloat(thStyles.paddingBlockStart),
			tableHeadBackground: thStyles.backgroundColor,
		};
	});

	expect(rhythm.proseGap).toBeGreaterThan(0);
	expect(rhythm.headingGap).toBeGreaterThan(rhythm.proseGap);
	expect(rhythm.listGap).toBeGreaterThan(0);
	expect(rhythm.h2Size).toBeGreaterThan(rhythm.h3Size);
	expect(rhythm.h3Size).toBeGreaterThan(rhythm.h4Size);
	expect(rhythm.h4Size).toBeGreaterThan(rhythm.h5Size);
	expect(rhythm.h5Size).toBeGreaterThanOrEqual(16);
	expect(rhythm.h6Size).toBeGreaterThanOrEqual(16);
	for (const margin of [rhythm.h4MarginStart, rhythm.h5MarginStart, rhythm.h6MarginStart]) {
		expect(Math.abs(margin - rhythm.headingGap)).toBeLessThanOrEqual(1);
	}
	expect(rhythm.definitionDisplay).toBe('grid');
	expect(rhythm.definitionGap).toBeGreaterThan(0);
	expect(rhythm.termWeight).toBeGreaterThanOrEqual(700);
	expect(rhythm.descriptionInset).toBe(0);
	expect(Math.abs(rhythm.separatorMargin - rhythm.headingGap)).toBeLessThanOrEqual(1);
	expect(rhythm.separatorBorder).toBeGreaterThanOrEqual(1);
	expect(Math.abs(rhythm.h2MarginStart - rhythm.headingGap)).toBeLessThanOrEqual(1);
	expect(Math.abs(rhythm.h2MarginEnd - rhythm.headingAfter)).toBeLessThanOrEqual(1);
	expect(rhythm.nestedGap).toBeGreaterThanOrEqual(rhythm.listGap - 1);
	expect(rhythm.codeLineHeight).toBeGreaterThan(20);
	expect(Math.abs(rhythm.codePaddingBlock - rhythm.stackGap)).toBeLessThanOrEqual(1);
	expect(Math.abs(rhythm.codePaddingInline - rhythm.proseGap)).toBeLessThanOrEqual(1);
	expect(Math.abs(rhythm.tableCellPadding - rhythm.space3)).toBeLessThanOrEqual(1);
	expect(rhythm.tableHeadBackground).not.toBe('rgba(0, 0, 0, 0)');
	await expectNoHorizontalOverflow(page, pagePath);

	await page.goto(postPath, { waitUntil: 'networkidle' });
	await expect(page.locator('.browser-quote-source')).toBeVisible();
	const navigationTargets = page.locator('.slateframe-post-navigation a');
	for (let index = 0; index < await navigationTargets.count(); index += 1) {
		expect((await navigationTargets.nth(index).boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	}
});

test('reading helpers preserve print and navigation structure', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const lead = page.locator('.browser-lead');
	await expect(lead).toBeVisible();
	expect(await lead.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(16);
	await expect(page.locator('.browser-toc a')).toHaveCount(2);

	await page.emulateMedia({ media: 'print' });
	expect(await page.locator('.slateframe-site-header').evaluate((element) => getComputedStyle(element).display)).toBe('none');
	expect(await page.locator('.slateframe-comments').evaluate((element) => getComputedStyle(element).display)).toBe('none');
});

test('knowledge block styles remain contained and readable', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	for (const selector of ['.browser-steps', '.browser-checklist', '.browser-key-facts']) {
		await expect(page.locator(selector)).toBeVisible();
	}

	await expectNoHorizontalOverflow(page, pagePath);
});

test('fallback child navigation is available at every responsive width', async ({ page }, testInfo) => {
	await page.goto('/', { waitUntil: 'networkidle' });

	const nestedList = page.locator('[data-primary-nav] .children').first();
	await expect(nestedList).toHaveCount(1);

	const compact = await page.locator('[data-site-header]').evaluate((node) => node.classList.contains('is-compact'));
	if (projectWidth(testInfo) <= 1280) {
		expect(compact).toBe(true);
	}
	if (compact) {
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

test('comment thread remains on the prose reading axis', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });

	const axes = await page.evaluate(() => {
		const heading = document.querySelector('.slateframe-comments-title');
		const list = document.querySelector('.slateframe-comment-list');

		if (!heading || !list) {
			throw new Error('Comment-axis fixtures are missing.');
		}

		return {
			headingLeft: heading.getBoundingClientRect().left,
			listLeft: list.getBoundingClientRect().left,
		};
	});

	expect(Math.abs(axes.headingLeft - axes.listLeft)).toBeLessThanOrEqual(1);

	const children = page.locator('.slateframe-comment-list .children').first();
	await expect(children).toBeVisible();
	const hierarchy = await children.evaluate((element) => {
		const styles = getComputedStyle(element);
		return {
			padding: Number.parseFloat(styles.paddingInlineStart),
			border: Number.parseFloat(styles.borderInlineStartWidth),
		};
	});
	expect(hierarchy.padding).toBeGreaterThan(0);
	expect(hierarchy.border).toBeGreaterThanOrEqual(1);

	await page.locator('html').evaluate((element) => { element.dir = 'rtl'; });
	const rtlBorders = await children.evaluate((element) => {
		const styles = getComputedStyle(element);
		return {
			direction: styles.direction,
			left: Number.parseFloat(styles.borderLeftWidth),
			right: Number.parseFloat(styles.borderRightWidth),
		};
	});
	expect(rtlBorders.direction).toBe('rtl');
	expect(rtlBorders.right).toBeGreaterThan(rtlBorders.left);
	await expectNoHorizontalOverflow(page, pagePath);
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



test('untitled content keeps a translatable navigation label in direct and search views', async ({ page }) => {
	await page.goto(untitledPostPath, { waitUntil: 'networkidle' });
	await expect(page.locator('.slateframe-entry-title')).toHaveText('Untitled');

	await page.goto('/?s=slateframe-untitled-fixture-token', { waitUntil: 'networkidle' });
	const card = page.locator('.slateframe-card').filter({ hasText: 'Untitled' });
	await expect(card).toHaveCount(1);
	await expect(card.locator('.slateframe-card-title a')).toHaveText('Untitled');
	await expectNoHorizontalOverflow(page, '/?s=slateframe-untitled-fixture-token');
});

test('sticky posts expose restrained editorial status on the home index', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });
	const card = page.locator('.slateframe-card').filter({ hasText: 'Slateframe Browser Post' });
	await expect(card).toHaveCount(1);
	await expect(card.locator('.slateframe-pattern-kicker')).toHaveText('Featured');
});

test('search reports a locale-aware result total', async ({ page }) => {
	await page.goto('/?s=slateframe-untitled-fixture-token', { waitUntil: 'networkidle' });
	await expect(page.locator('.slateframe-archive-description')).toContainText('1 result found');
});

test('Pages share responsive featured media and content-owned captions with posts', async ({ page }) => {
	await page.goto(featuredPagePath, { waitUntil: 'networkidle' });
	const hero = page.locator('.slateframe-entry-hero');
	await expect(hero.locator('img')).toBeVisible();
	await expect(hero.locator('figcaption')).toHaveText('A reusable featured image caption.');
	const image = hero.locator('img');
	await expect(image).toHaveAttribute('fetchpriority', 'high');
	await expect(image).toHaveAttribute('loading', 'eager');
	await expect(image).toHaveAttribute('decoding', 'async');
	const responsive = await image.evaluate((node) => ({
		srcset: node.getAttribute('srcset'),
		sizes: node.getAttribute('sizes'),
	}));
	if (responsive.srcset) {
		expect(responsive.srcset).toMatch(/\s\d+w(?:,|$)/);
		expect(responsive.sizes).toBeTruthy();
	} else {
		expect(responsive.sizes).toBeNull();
	}
	const dimensions = await image.evaluate((node) => ({
		width: node.getBoundingClientRect().width,
		naturalWidth: node.naturalWidth,
		naturalHeight: node.naturalHeight,
		intrinsicWidth: Number(node.getAttribute('width')),
		intrinsicHeight: Number(node.getAttribute('height')),
	}));
	expect(dimensions.width).toBeGreaterThan(0);
	expect(dimensions.naturalWidth).toBeGreaterThan(0);
	expect(dimensions.naturalHeight).toBeGreaterThan(0);
	expect(dimensions.naturalWidth).toBeLessThanOrEqual(dimensions.intrinsicWidth);
	expect(dimensions.naturalHeight).toBeLessThanOrEqual(dimensions.intrinsicHeight);
	expect(dimensions.naturalWidth / dimensions.naturalHeight).toBeCloseTo(4 / 3, 1);
	expect(dimensions.intrinsicWidth).toBe(1200);
	expect(dimensions.intrinsicHeight).toBe(900);
	await expectNoHorizontalOverflow(page, featuredPagePath);
});

test('attachment pages expose media, metadata, original file, and parent recovery', async ({ page }) => {
	await page.goto(attachmentPath, { waitUntil: 'networkidle' });
	await expect(page.locator('.slateframe-entry-title')).toHaveText('Slateframe Media Attachment');
	await expect(page.locator('.slateframe-prose img')).toBeVisible();
	await expect(page.locator('.slateframe-prose figcaption')).toHaveText('A reusable featured image caption.');
	await expect(page.locator('.slateframe-entry-footer')).toContainText('image/png');
	await expect(page.locator('.slateframe-entry-footer')).toContainText('1,200 × 900 px');
	const original = page.getByRole('link', { name: 'Open original file' });
	const parent = page.getByRole('link', { name: 'Back to Slateframe Featured Media Page' });
	await expect(original).toHaveAttribute('href', /\/slateframe-project-landscape\.png$/);
	await expect(parent).toBeVisible();
	for (const target of [original, parent]) {
		expect((await target.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	}
	await expectNoHorizontalOverflow(page, attachmentPath);
});

test('capture core media publishing evidence', async ({ page }, testInfo) => {
	test.skip(![390, 1440].includes(projectWidth(testInfo)), 'Representative media screenshots only.');
	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });

	for (const [name, route] of [['featured-page', featuredPagePath], ['attachment', attachmentPath]]) {
		await page.goto(route, { waitUntil: 'networkidle' });
		await page.screenshot({
			path: path.join(screenshotDir, `${testInfo.project.name}-${name}.png`),
			fullPage: true,
		});
	}
});

test('photography fixtures preserve natural image proportions and captions', async ({ page }) => {
	await page.goto(photoPath, { waitUntil: 'networkidle' });
	await expect(page.locator('.browser-photo-feature img')).toBeVisible();
	await expect(page.locator('.browser-photo-gallery figcaption')).toHaveCount(2);
	await expect(page.locator('.browser-photo-diptych img')).toHaveCount(2);
	const ratios = await page.evaluate(() => {
		const read = (selector) => {
			const image = document.querySelector(selector);
			const rect = image.getBoundingClientRect();
			return {
				ratio: rect.width / rect.height,
				height: rect.height,
				fit: getComputedStyle(image).objectFit,
			};
		};
		return {
			landscape: read('.browser-photo-gallery img[alt="Wide landscape fixture"]'),
			portrait: read('.browser-photo-gallery img[alt="Tall portrait fixture"]'),
			feature: read('.browser-photo-feature img'),
			viewportHeight: window.innerHeight,
		};
	});
	expect(ratios.landscape.ratio).toBeGreaterThan(1.5);
	expect(ratios.portrait.ratio).toBeLessThan(0.8);
	expect(ratios.landscape.fit).toBe('contain');
	expect(ratios.portrait.fit).toBe('contain');
	expect(ratios.feature.fit).toBe('contain');
	expect(ratios.portrait.height).toBeLessThanOrEqual((ratios.viewportHeight * 0.62) + 2);

	const captionPresentation = await page.locator('.browser-photo-gallery figcaption').first().evaluate((caption) => {
		const styles = getComputedStyle(caption);
		return {
			position: styles.position,
			backgroundImage: styles.backgroundImage,
			color: styles.color,
		};
	});
	expect(captionPresentation.position).toBe('static');
	expect(captionPresentation.backgroundImage).toBe('none');
	await expectNoHorizontalOverflow(page, photoPath);
});

test('photography diptych switches from one to two columns without cropping', async ({ page }, testInfo) => {
	await page.goto(photoPath, { waitUntil: 'networkidle' });

	const presentation = await page.locator('.browser-photo-diptych').evaluate((gallery) => {
		const styles = getComputedStyle(gallery);
		const images = [...gallery.querySelectorAll('img')];
		return {
			tracks: styles.gridTemplateColumns.split(' ').filter(Boolean).length,
			fits: images.map((image) => getComputedStyle(image).objectFit),
			heights: images.map((image) => image.getBoundingClientRect().height),
			viewportHeight: window.innerHeight,
		};
	});

	if (projectWidth(testInfo) <= 540) {
		expect(presentation.tracks).toBe(1);
	} else {
		expect(presentation.tracks).toBe(2);
	}

	expect(presentation.fits).toEqual(['contain', 'contain']);
	for (const height of presentation.heights) {
		expect(height).toBeLessThanOrEqual((presentation.viewportHeight * 0.62) + 2);
	}

	const captions = page.locator('.browser-photo-diptych figcaption');
	await expect(captions).toHaveCount(2);
	const captionStyles = await captions.evaluateAll((nodes) => nodes.map((caption) => {
		const styles = getComputedStyle(caption);
		return {
			position: styles.position,
			backgroundImage: styles.backgroundImage,
			wrap: styles.overflowWrap,
		};
	}));
	expect(captionStyles).toEqual([
		{ position: 'static', backgroundImage: 'none', wrap: 'anywhere' },
		{ position: 'static', backgroundImage: 'none', wrap: 'anywhere' },
	]);
	await expectNoHorizontalOverflow(page, photoPath);
});

test('portfolio Query Loop keeps multilingual project references contained', async ({ page }) => {
	await page.goto(projectPath, { waitUntil: 'networkidle' });

	const grid = page.locator('.browser-project-grid');
	await expect(grid).toBeVisible();
	await expect(grid.locator('.slateframe-project-card')).toHaveCount(6);

	const firstTitleLink = grid.locator('.wp-block-post-title a').first();
	await expect(firstTitleLink).toBeVisible();
	await expect(firstTitleLink).toContainText('可迁移的项目案例');
	await expect(grid.locator('.wp-block-post-excerpt')).toHaveCount(6);
	await expect(grid.locator('.wp-block-post-date')).toHaveCount(6);

	const bounds = await firstTitleLink.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return {
			left: rect.left,
			right: rect.right,
			viewport: document.documentElement.clientWidth,
		};
	});
	expect(bounds.left).toBeGreaterThanOrEqual(-1);
	expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
	await expectNoHorizontalOverflow(page, projectPath);
});

test('knowledge callouts respect RTL direction and logical layout', async ({ page }) => {
	await page.goto(knowledgePath, { waitUntil: 'networkidle' });
	const callout = page.locator('.browser-learning-callout');
	await expect(callout).toHaveAttribute('dir', 'rtl');
	expect(await callout.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
	await expect(page.locator('.browser-rtl-steps li')).toHaveCount(3);

	const definition = page.locator('.browser-definition');
	await expect(definition).toHaveAttribute('dir', 'rtl');
	const definitionBorders = await definition.evaluate((element) => {
		const styles = getComputedStyle(element);
		return {
			direction: styles.direction,
			inlineStart: Number.parseFloat(styles.borderInlineStartWidth),
			right: Number.parseFloat(styles.borderRightWidth),
			left: Number.parseFloat(styles.borderLeftWidth),
		};
	});
	expect(definitionBorders.direction).toBe('rtl');
	expect(definitionBorders.inlineStart).toBeGreaterThanOrEqual(3);
	expect(definitionBorders.right).toBeGreaterThan(definitionBorders.left);
	await expectNoHorizontalOverflow(page, knowledgePath);
});

test('capture WordPress.org screenshot candidate from the real showcase fixture', async ({ page }, testInfo) => {
	test.skip(projectWidth(testInfo) !== 1440, 'The release screenshot candidate is captured once.');

	await page.setViewportSize({ width: 1200, height: 900 });
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	await expect(page.locator('[data-menu-toggle]')).toBeVisible();
	await expect(page.locator('[data-primary-nav]')).toHaveAttribute('inert', '');
	await expect(page.locator('h1')).toHaveText('A clean frame for whatever you publish');
	await expect(page.locator('.slateframe-showcase-feature img')).toBeVisible();
	await expect(page.locator('.slateframe-showcase-grid .wp-block-column')).toHaveCount(3);
	await expectNoHorizontalOverflow(page, showcasePath);

	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	await page.screenshot({
		path: path.join(screenshotDir, 'wordpress-org-screenshot-candidate.png'),
		fullPage: false,
	});
});

test('capture content-mode showcase screenshots', async ({ page }, testInfo) => {
	test.skip(![390, 1440].includes(projectWidth(testInfo)), 'Representative mobile and desktop screenshots only.');
	const screenshotDir = path.resolve('test-artifacts/screenshots');
	await fs.mkdir(screenshotDir, { recursive: true });
	for (const [name, route] of [['photography', photoPath], ['portfolio', projectPath], ['knowledge', knowledgePath], ['showcase', showcasePath]]) {
		await page.goto(route, { waitUntil: 'networkidle' });
		await page.screenshot({ path: path.join(screenshotDir, `${testInfo.project.name}-${name}.png`), fullPage: true });
	}
});


test('reading stylesheet is requested only for singular documents', async ({ page }) => {
	const requests = [];
	page.on('request', (request) => {
		if (request.url().includes('/assets/css/reading.css')) {
			requests.push(request.url());
		}
	});

	for (const route of ['/', '/?s=Slateframe']) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `non-singular route should keep reading CSS unloaded: ${route}`).toHaveLength(0);
	}

	for (const route of [pagePath, postPath, photoPath, projectPath, knowledgePath, showcasePath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `singular route should load reading CSS: ${route}`).toHaveLength(1);
	}
});

test('content-mode stylesheet stays off Photography-only and ordinary documents', async ({ page }) => {
	const requests = [];
	page.on('request', (request) => {
		if (request.url().includes('/assets/css/content-modes.css')) {
			requests.push(request.url());
		}
	});

	for (const route of [postPath, photoPath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `shared content-mode stylesheet should stay unloaded on ${route}`).toHaveLength(0);
	}

	for (const route of [projectPath, knowledgePath, showcasePath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `content-mode stylesheet should load on ${route}`).toHaveLength(1);
	}
});

test('Photography stylesheet is requested only for Photography content', async ({ page }) => {
	const requests = [];
	page.on('request', (request) => {
		if (request.url().includes('/assets/css/photography.css')) {
			requests.push(request.url());
		}
	});

	for (const route of [postPath, projectPath, knowledgePath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `Photography stylesheet should stay unloaded on ${route}`).toHaveLength(0);
	}

	for (const route of [photoPath, showcasePath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `Photography stylesheet should load on ${route}`).toHaveLength(1);
	}
});

test('portfolio Query Loop stylesheet is requested only for project-grid documents', async ({ page }) => {
	const requests = [];
	page.on('request', (request) => {
		if (request.url().includes('/assets/css/query-loop.css')) {
			requests.push(request.url());
		}
	});

	for (const route of [postPath, photoPath, knowledgePath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `non-project route should keep Query Loop CSS unloaded: ${route}`).toHaveLength(0);
	}

	for (const route of [projectPath, showcasePath]) {
		requests.length = 0;
		await page.goto(route, { waitUntil: 'networkidle' });
		expect(requests, `project-grid route should load Query Loop CSS: ${route}`).toHaveLength(1);
	}
});

test('native portfolio Query Loop is populated, responsive, and accessible', async ({ page }, testInfo) => {
	await page.goto(projectPath, { waitUntil: 'networkidle' });
	const grid = page.locator('.browser-project-grid .wp-block-post-template');
	await expect(grid).toBeVisible();
	await expect(page.locator('.browser-project-grid .slateframe-project-card')).toHaveCount(6);
	await expect(page.locator('.browser-project-grid .wp-block-post-featured-image img')).toHaveCount(5);
	const mediaImages = page.locator('.browser-project-grid .wp-block-post-featured-image img');
	const orientations = new Set();
	for (const image of await mediaImages.all()) {
		await image.scrollIntoViewIfNeeded();
		await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
		const media = await image.evaluate((node) => {
			const figure = node.closest('.wp-block-post-featured-image');
			const box = figure.getBoundingClientRect();
			return {
				naturalWidth: node.naturalWidth,
				naturalHeight: node.naturalHeight,
				alt: node.alt,
				postTitle: node.closest('.slateframe-project-card')?.querySelector('.wp-block-post-title')?.textContent?.trim() || '',
				srcset: node.getAttribute('srcset') || '',
				currentSrc: node.currentSrc,
				figureRatio: box.width / box.height,
			};
		});
		expect(media.naturalWidth).toBeGreaterThanOrEqual(300);
		expect(media.naturalHeight).toBeGreaterThanOrEqual(300);
		expect(media.postTitle).toMatch(/^Portable project fixture [1-6]$/);
		expect(media.alt, 'Core may use the post title or attachment alternative text').toBeTruthy();
		expect([media.postTitle, 'Landscape project illustration', 'Portrait project illustration']).toContain(media.alt);
		expect(media.srcset, 'WordPress must emit responsive image candidates').toContain('w');
		expect(media.currentSrc).toMatch(/slateframe-project-(?:landscape|portrait)/);
		expect(Math.abs(media.figureRatio - 4 / 3), 'project image crops retain the declared 4:3 geometry').toBeLessThanOrEqual(0.12);
		orientations.add(media.naturalWidth > media.naturalHeight ? 'landscape' : 'portrait');
	}
	expect([...orientations].sort()).toEqual(['landscape', 'portrait']);
	const firstCard = page.locator('.browser-project-grid .slateframe-project-card').first();
	await expect(firstCard.locator('.wp-block-post-featured-image')).toHaveCount(0);
	await expect(firstCard.locator('.wp-block-post-title a')).toContainText('可迁移的项目案例');

	const tracks = await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
	if (projectWidth(testInfo) <= 640) {
		expect(tracks).toBe(1);
	} else if (projectWidth(testInfo) <= 900) {
		expect(tracks).toBe(2);
	} else {
		expect(tracks).toBe(3);
	}

	const featuredImage = page.locator('.browser-project-grid .wp-block-post-featured-image').first();
	if (await featuredImage.count()) {
		const mediaRhythm = await featuredImage.evaluate((element) => {
			const probe = document.createElement('i');
			probe.style.cssText = 'position:absolute;visibility:hidden;inline-size:var(--slateframe-media-gap)';
			document.body.append(probe);
			const mediaGap = Number.parseFloat(getComputedStyle(probe).inlineSize);
			probe.remove();
			return { mediaGap, margin: Number.parseFloat(getComputedStyle(element).marginBlockEnd) };
		});
		expect(Math.abs(mediaRhythm.margin - mediaRhythm.mediaGap)).toBeLessThanOrEqual(1);
	}

	if (projectWidth(testInfo) > 900) {
		const firstRow = await page.locator('.browser-project-grid .slateframe-project-card').evaluateAll((cards) =>
			cards.slice(0, 3).map((card) => {
				const cardBox = card.getBoundingClientRect();
				const dateBox = card.querySelector('.wp-block-post-date').getBoundingClientRect();
				return { height: cardBox.height, dateBottom: dateBox.bottom };
			})
		);
		expect(Math.max(...firstRow.map((item) => item.height)) - Math.min(...firstRow.map((item) => item.height))).toBeLessThanOrEqual(2);
		expect(Math.max(...firstRow.map((item) => item.dateBottom)) - Math.min(...firstRow.map((item) => item.dateBottom))).toBeLessThanOrEqual(2);
	}

	const titles = page.locator('.browser-project-grid .wp-block-post-title');
	for (let index = 0; index < await titles.count(); index += 1) {
		const box = await titles.nth(index).boundingBox();
		expect(box?.width || 0).toBeGreaterThan(0);
		expect((box?.x || 0) + (box?.width || 0)).toBeLessThanOrEqual((await page.evaluate(() => document.documentElement.clientWidth)) + 1);
	}

	const pagination = page.locator('.browser-project-grid .wp-block-query-pagination');
	const numbers = pagination.locator('.wp-block-query-pagination-numbers');
	const next = pagination.locator('.wp-block-query-pagination-next:visible');
	await expect(pagination).toBeVisible();
	await expect(numbers).toBeVisible();
	await expect(next).toHaveCount(1);
	expect((await next.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	expect(await numbers.evaluate((node) => getComputedStyle(node).display)).toBe('flex');
	const current = numbers.locator('.current');
	await expect(current).toBeVisible();
	const currentStyle = await current.evaluate((node) => ({
		background: getComputedStyle(node).backgroundColor,
		radius: Number.parseFloat(getComputedStyle(node).borderRadius),
	}));
	expect(currentStyle.background).not.toBe('rgba(0, 0, 0, 0)');
	expect(currentStyle.radius).toBeGreaterThanOrEqual(0);
	await expectNoHorizontalOverflow(page, projectPath);

	const firstPageTitles = await page.locator('.browser-project-grid .wp-block-post-title a').allTextContents();
	expect(firstPageTitles).toHaveLength(6);
	expect(firstPageTitles[0]).toContain('可迁移的项目案例');
	expect(firstPageTitles[5]).toContain('Portable project fixture 2');

	await next.click();
	await page.waitForLoadState('networkidle');
	await expect(page.locator('.browser-project-grid .slateframe-project-card')).toHaveCount(1);
	await expect(page.locator('.browser-project-grid .wp-block-post-title a').first()).toContainText('Portable project fixture 1');
	const previous = page.locator('.browser-project-grid .wp-block-query-pagination-previous:visible');
	await expect(previous).toHaveCount(1);
	expect((await previous.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	await expectNoHorizontalOverflow(page, projectPath + '#portfolio-page-two');
});



test('portable showcase modes respond as a coherent editorial system', async ({ page }, testInfo) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });

	await expect(page.locator('.browser-sequence-gallery img')).toHaveCount(3);
	await expect(page.locator('.browser-sequence-gallery figcaption')).toHaveCount(3);
	await expect(page.locator('.browser-project-card')).toHaveCount(6);
	await expect(page.locator('.browser-learning-checkpoint > .wp-block-column')).toHaveCount(2);

	const layout = await page.evaluate(() => {
		const gallery = document.querySelector('.browser-sequence-gallery');
		const galleryItems = [...gallery.querySelectorAll(':scope > .wp-block-image')];
		const projectTemplate = document.querySelector('.browser-project-grid .wp-block-post-template');
		const firstProjectCard = projectTemplate.querySelector('.browser-project-card');
		const captions = [...gallery.querySelectorAll('figcaption')];

		return {
			galleryTracks: getComputedStyle(gallery).gridTemplateColumns.split(' ').filter(Boolean).length,
			projectTracks: getComputedStyle(projectTemplate).gridTemplateColumns.split(' ').filter(Boolean).length,
			projectWidth: projectTemplate.getBoundingClientRect().width,
			firstProjectCardWidth: firstProjectCard.getBoundingClientRect().width,
			firstWidth: galleryItems[0].getBoundingClientRect().width,
			secondWidth: galleryItems[1].getBoundingClientRect().width,
			captionPositions: captions.map((caption) => getComputedStyle(caption).position),
		};
	});

	if (projectWidth(testInfo) <= 640) {
		expect(layout.galleryTracks).toBe(1);
		expect(layout.projectTracks).toBe(1);
		expect(Math.abs(layout.firstWidth - layout.secondWidth)).toBeLessThanOrEqual(2);
	} else {
		expect(layout.galleryTracks).toBe(2);
		expect(layout.firstWidth).toBeGreaterThan(layout.secondWidth * 1.7);
		expect(layout.projectTracks).toBe(projectWidth(testInfo) <= 900 ? 2 : 3);
	}

	if (projectWidth(testInfo) >= 1440) {
		expect(layout.projectWidth).toBeGreaterThan(900);
	}

	expect(layout.firstProjectCardWidth).toBeGreaterThan(220);
	expect(layout.captionPositions).toEqual(['static', 'static', 'static']);
	await expect(page.locator('.browser-project-grid .wp-block-query-pagination')).toBeVisible();
	await expectNoHorizontalOverflow(page, showcasePath);
});


test('project decisions and knowledge procedures remain structured and contained', async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });

	await expect(page.locator('.browser-project-decision-steps li')).toHaveCount(3);
	await expect(page.locator('.browser-project-evidence')).toBeVisible();
	await expect(page.locator('.browser-knowledge-procedure-steps li')).toHaveCount(3);
	await expect(page.locator('.browser-knowledge-verification .is-style-slateframe-checklist li')).toHaveCount(2);
	await expect(page.locator('.browser-i18n-comparison > .wp-block-column')).toHaveCount(2);

	for (const selector of [
		'.browser-project-decision',
		'.browser-project-evidence',
		'.browser-knowledge-procedure',
		'.browser-knowledge-verification',
		'.browser-knowledge-comparison',
	]) {
		const bounds = await page.locator(selector).evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return { left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
		});
		expect(bounds.left, selector).toBeGreaterThanOrEqual(-1);
		expect(bounds.right, selector).toBeLessThanOrEqual(bounds.viewport + 1);
	}

	await expectNoHorizontalOverflow(page, showcasePath);
});

test('showcase media reserves intrinsic space to reduce layout-shift risk', async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });

	const dimensions = await page.locator('.browser-sequence-gallery img').evaluateAll((images) =>
		images.map((image) => ({
			width: Number(image.getAttribute('width')),
			height: Number(image.getAttribute('height')),
			clientWidth: image.getBoundingClientRect().width,
			clientHeight: image.getBoundingClientRect().height,
			fit: getComputedStyle(image).objectFit,
		}))
	);

	for (const image of dimensions) {
		expect(image.width).toBeGreaterThan(0);
		expect(image.height).toBeGreaterThan(0);
		expect(image.clientWidth).toBeGreaterThan(0);
		expect(image.clientHeight).toBeGreaterThan(0);
		expect(image.fit).toBe('contain');
	}

	await expectNoHorizontalOverflow(page, showcasePath);
});

test('post metadata never emits an unnamed author link', async ({ page }) => {
	for (const route of ['/', postPath]) {
		await page.goto(route, { waitUntil: 'networkidle' });
		const unnamed = await page.locator('.slateframe-entry-meta a').evaluateAll((links) =>
			links.filter((link) => {
				const text = (link.textContent || '').trim();
				const label = (link.getAttribute('aria-label') || '').trim();
				return !text && !label;
			}).length
		);
		expect(unnamed, `unnamed metadata links on ${route}`).toBe(0);
	}
});
