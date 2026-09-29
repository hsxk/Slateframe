const { test, expect } = require('@playwright/test');

const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || pagePath;
const photoPath = process.env.SLATEFRAME_PHOTO_PATH || pagePath;
const projectPath = process.env.SLATEFRAME_PROJECT_PATH || pagePath;

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
		'--slateframe-space-2', '--slateframe-space-3', '--slateframe-space-4',
		'--slateframe-stack-gap', '--slateframe-media-gap', '--slateframe-caption-gap',
		'--slateframe-prose-gap', '--slateframe-heading-gap', '--slateframe-gutter',
		'--slateframe-section', '--slateframe-content', '--slateframe-wide', '--slateframe-chrome',
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
	await page.goto(pagePath, { waitUntil: 'networkidle' });
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
	const durationSeconds = await page.evaluate(() => {
		const probe = document.createElement('div');
		probe.style.transition = 'opacity 200ms ease';
		document.body.append(probe);
		const value = getComputedStyle(probe).transitionDuration.trim();
		probe.remove();
		return value.endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
	});
	expect(durationSeconds).toBeLessThanOrEqual(0.00001);
});

test('portfolio media hover respects reduced-motion preference', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(projectPath, { waitUntil: 'networkidle' });
	const image = page.locator('.browser-project-grid .wp-block-post-featured-image img').first();
	await expect(image).toBeVisible();
	const state = await image.evaluate((node) => {
		const styles = getComputedStyle(node);
		return { transition: Number.parseFloat(styles.transitionDuration), transform: styles.transform };
	});
	expect(state.transition).toBeLessThanOrEqual(0.01);
	expect(state.transform).toBe('none');
});

test('design system remains viewport-contained after 200 percent zoom equivalent', async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	const metrics = await page.evaluate(() => {
		document.documentElement.style.fontSize = '32px';
		const viewport = document.documentElement.clientWidth;
		const offenders = [...document.body.querySelectorAll('*')]
			.map((node) => {
				const rect = node.getBoundingClientRect();
				return {
					tag: node.tagName.toLowerCase(),
					className: typeof node.className === 'string' ? node.className : '',
					left: Math.round(rect.left),
					right: Math.round(rect.right),
					width: Math.round(rect.width),
				};
			})
			.filter((item) => item.left < -1 || item.right > viewport + 1)
			.sort((a, b) => Math.max(b.right - viewport, -b.left) - Math.max(a.right - viewport, -a.left))
			.slice(0, 12);
		const textOffenders = [];
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node && textOffenders.length < 12; node = walker.nextNode()) {
			if (!node.textContent.trim()) continue;
			const range = document.createRange();
			range.selectNodeContents(node);
			const rect = range.getBoundingClientRect();
			if (rect.left < -1 || rect.right > viewport + 1) {
				textOffenders.push({
					text: node.textContent.trim().slice(0, 80),
					parent: node.parentElement?.tagName.toLowerCase() || '',
					parentClass: node.parentElement?.className || '',
					left: Math.round(rect.left),
					right: Math.round(rect.right),
					width: Math.round(rect.width),
				});
			}
		}
		return {
			viewport,
			rootScrollWidth: document.documentElement.scrollWidth,
			bodyScrollWidth: document.body.scrollWidth,
			overflow: document.documentElement.scrollWidth - viewport,
			offenders,
			textOffenders,
		};
	});
	expect(metrics.overflow, JSON.stringify(metrics)).toBeLessThanOrEqual(1);
});

test('core table wrappers own intrinsic overflow after 200 percent text resizing', async ({ page }) => {
	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	const metrics = await page.evaluate(() => {
		document.documentElement.style.fontSize = '32px';
		const viewport = document.documentElement.clientWidth;
		return {
			viewport,
			rootOverflow: document.documentElement.scrollWidth - viewport,
			tables: [...document.querySelectorAll('.wp-block-table')].map((wrapper) => {
				const rect = wrapper.getBoundingClientRect();
				const table = wrapper.querySelector('table');
				return {
					left: Math.round(rect.left),
					right: Math.round(rect.right),
					clientWidth: Math.round(wrapper.clientWidth),
					scrollWidth: Math.round(wrapper.scrollWidth),
					tableWidth: Math.round(table?.getBoundingClientRect().width || 0),
				};
			}),
		};
	});
	expect(metrics.tables.length).toBeGreaterThan(0);
	for (const table of metrics.tables) {
		expect(table.left).toBeGreaterThanOrEqual(-1);
		expect(table.right).toBeLessThanOrEqual(metrics.viewport + 1);
		expect(table.scrollWidth).toBeGreaterThanOrEqual(table.clientWidth);
	}
	expect(metrics.rootOverflow, JSON.stringify(metrics)).toBeLessThanOrEqual(1);
});


test('core page headers share the tokenized page-start rhythm', async ({ page }) => {
	const routes = [pagePath, '/?s=Slateframe', '/slateframe-browser-missing-route/'];

	for (const route of routes) {
		await page.goto(route, { waitUntil: 'networkidle' });
		const header = page.locator('.slateframe-page-header').first();
		await expect(header).toBeVisible();

		const rhythm = await header.evaluate((node) => {
			const resolveToken = (token) => {
				const probe = document.createElement('i');
				probe.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${token})`;
				document.body.append(probe);
				const value = Number.parseFloat(getComputedStyle(probe).inlineSize);
				probe.remove();
				return value;
			};
			const styles = getComputedStyle(node);
			return {
				start: Number.parseFloat(styles.paddingBlockStart),
				end: Number.parseFloat(styles.paddingBlockEnd),
				section: resolveToken('--slateframe-section'),
				stack: resolveToken('--slateframe-stack-gap'),
				component: resolveToken('--slateframe-component-gap'),
			};
		});

		expect(Math.abs(rhythm.start - rhythm.section), route).toBeLessThanOrEqual(1);
		expect(Math.abs(rhythm.end - (rhythm.stack + rhythm.component)), route).toBeLessThanOrEqual(1);
	}
});

test('display titles use a script-neutral measure for long CJK strings', async ({ page }, testInfo) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	await page.evaluate(() => {
		document.documentElement.lang = 'ja';
		document.documentElement.dir = 'ltr';
	});

	const title = page.locator('.slateframe-entry-title').first();
	await title.evaluate((node) => {
		node.textContent = '非常に長い日本語と中文の公開タイトルでも読みやすい幅を保ちレイアウトからはみ出さない';
	});

	const metrics = await title.evaluate((node) => {
		const styles = getComputedStyle(node);
		const rect = node.getBoundingClientRect();
		return {
			maxWidth: styles.maxWidth,
			maxMeasure: 'none' === styles.maxWidth ? null : Number.parseFloat(styles.maxWidth) / Number.parseFloat(styles.fontSize),
			right: rect.right,
			viewport: document.documentElement.clientWidth,
			rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		};
	});

	const viewportWidth = testInfo.project.use.viewport?.width || 1440;
	if (viewportWidth <= 480) {
		expect(metrics.maxWidth).toBe('none');
	} else {
		expect(metrics.maxMeasure).toBeGreaterThan(13.5);
		expect(metrics.maxMeasure).toBeLessThan(14.5);
	}
	expect(metrics.right).toBeLessThanOrEqual(metrics.viewport + 1);
	expect(metrics.rootOverflow).toBeLessThanOrEqual(1);
});

test('ordinary reading children remain on the shared content measure', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const widths = await page.evaluate(() => {
		const normal = document.querySelector('.browser-default-prose');
		const contentWidth = normal?.getBoundingClientRect().width || 0;
		const ordinary = [...document.querySelectorAll('.slateframe-prose > :not(.alignwide):not(.alignfull)')]
			.map((node) => ({
				tag: node.tagName.toLowerCase(),
				width: node.getBoundingClientRect().width,
				minInlineSize: getComputedStyle(node).minInlineSize,
			}));
		return { contentWidth, ordinary };
	});

	expect(widths.contentWidth).toBeGreaterThan(0);
	for (const item of widths.ordinary) {
		expect(item.width, item.tag).toBeLessThanOrEqual(widths.contentWidth + 2);
		expect(item.minInlineSize, item.tag).toBe('0px');
	}
});

test('plugin-style tables scroll locally and remain keyboard reachable', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const table = page.locator('.browser-tablepress');
	await expect(table).toBeVisible();
	await expect(table).toHaveAttribute('tabindex', '0');

	const readableCellWidths = await table.locator('td').evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
	expect(readableCellWidths.length).toBeGreaterThan(0);
	expect(Math.min(...readableCellWidths)).toBeGreaterThanOrEqual(120);

	await table.evaluate((node) => {
		node.style.whiteSpace = 'nowrap';
	});

	const metrics = await table.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		return {
			clientWidth: node.clientWidth,
			scrollWidth: node.scrollWidth,
			left: rect.left,
			right: rect.right,
			viewport: document.documentElement.clientWidth,
			rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			overflowX: getComputedStyle(node).overflowX,
		};
	});

	expect(metrics.overflowX).toBe('auto');
	expect(metrics.scrollWidth).toBeGreaterThanOrEqual(metrics.clientWidth);
	expect(metrics.left).toBeGreaterThanOrEqual(-1);
	expect(metrics.right).toBeLessThanOrEqual(metrics.viewport + 1);
	expect(metrics.rootOverflow).toBeLessThanOrEqual(1);

	await table.focus();
	await expect(table).toBeFocused();
	const focus = await table.evaluate((node) => {
		const styles = getComputedStyle(node);
		return { style: styles.outlineStyle, width: Number.parseFloat(styles.outlineWidth) };
	});
	expect(focus.style).not.toBe('none');
	expect(focus.width).toBeGreaterThanOrEqual(2);

	const zoomed = await page.evaluate(() => {
		document.documentElement.dir = 'rtl';
		document.documentElement.style.fontSize = '32px';
		const node = document.querySelector('.browser-tablepress');
		const rect = node.getBoundingClientRect();
		return {
			clientWidth: node.clientWidth,
			scrollWidth: node.scrollWidth,
			left: rect.left,
			right: rect.right,
			viewport: document.documentElement.clientWidth,
			rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		};
	});
	expect(zoomed.scrollWidth).toBeGreaterThanOrEqual(zoomed.clientWidth);
	expect(zoomed.left).toBeGreaterThanOrEqual(-1);
	expect(zoomed.right).toBeLessThanOrEqual(zoomed.viewport + 1);
	expect(zoomed.rootOverflow).toBeLessThanOrEqual(1);
});

test('mobile navigation stays inside the viewport when content grows', async ({ page }, testInfo) => {
	const viewportWidth = testInfo.project.use.viewport?.width || 1440;
	test.skip(viewportWidth > 1280, 'Compact navigation contract.');

	await page.goto('/', { waitUntil: 'networkidle' });
	await page.locator('[data-menu-toggle]').click();
	const nav = page.locator('[data-primary-nav]');
	await expect(nav).toBeVisible();

	await nav.evaluate((node) => {
		const list = node.querySelector('ul');
		if (!list) return;
		for (let index = 0; index < 12; index += 1) {
			const item = document.createElement('li');
			item.innerHTML = '<a href="#">A deliberately long translated navigation destination</a>';
			list.append(item);
		}
	});

	const metrics = await nav.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		const styles = getComputedStyle(node);
		return {
			top: rect.top,
			bottom: rect.bottom,
			height: rect.height,
			viewportHeight: window.innerHeight,
			maxBlockSize: styles.maxBlockSize,
			overflowY: styles.overflowY,
			scrollHeight: node.scrollHeight,
			clientHeight: node.clientHeight,
		};
	});

	expect(metrics.maxBlockSize).not.toBe('none');
	expect(metrics.overflowY).toBe('auto');
	expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
	expect(metrics.scrollHeight).toBeGreaterThanOrEqual(metrics.clientHeight);
});


test('wide navigation compacts for translated growth and recovers when space returns', async ({ page }, testInfo) => {
	const viewportWidth = testInfo.project.use.viewport?.width || 1440;
	test.skip(viewportWidth !== 1920, 'Content-driven compact navigation is sampled on the widest project.');

	await page.goto('/', { waitUntil: 'networkidle' });
	const header = page.locator('[data-site-header]');
	const nav = page.locator('[data-primary-nav]');
	const toggle = page.locator('[data-menu-toggle]');
	await expect(header).not.toHaveClass(/is-compact/);

	await nav.locator(':scope > ul').evaluate((list) => {
		for (let index = 0; index < 4; index += 1) {
			const item = document.createElement('li');
			item.className = 'browser-long-navigation-item';
			item.innerHTML = '<a href="#">A deliberately extensive translated navigation destination 中文 العربية 日本語</a>';
			list.append(item);
		}
	});

	await expect(header).toHaveClass(/is-compact/);
	await expect(nav).toHaveClass(/is-compact/);
	await expect(toggle).toBeVisible();
	await expect(nav).toHaveAttribute('inert', '');

	await nav.locator('.browser-long-navigation-item').evaluateAll((items) => items.forEach((item) => item.remove()));
	await expect(header).not.toHaveClass(/is-compact/);
	await expect(nav).not.toHaveClass(/is-compact/);
	await expect(toggle).toBeHidden();
	await expect(nav).not.toHaveAttribute('inert', '');
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('desktop navigation and language adapter share one header row', async ({ page }, testInfo) => {
	const viewportWidth = testInfo.project.use.viewport?.width || 1440;
	test.skip(viewportWidth !== 1920, 'Wide header row is sampled where the fixture has enough inline space.');

	await page.goto('/', { waitUntil: 'networkidle' });
	const metrics = await page.evaluate(() => {
		const nav = document.querySelector('[data-primary-nav]');
		const menu = nav?.querySelector(':scope > ul');
		const language = nav?.querySelector('.slateframe-language-slot');
		const inner = document.querySelector('.slateframe-header-inner');
		if (!nav || !menu || !language || !inner) {
			throw new Error('Desktop navigation fixture is incomplete.');
		}
		const menuRect = menu.getBoundingClientRect();
		const languageRect = language.getBoundingClientRect();
		const innerRect = inner.getBoundingClientRect();
		const root = getComputedStyle(document.documentElement);
		const probe = document.createElement('i');
		probe.style.cssText = 'position:absolute;visibility:hidden;block-size:var(--slateframe-header-height)';
		document.body.append(probe);
		const headerHeight = probe.getBoundingClientRect().height;
		probe.remove();
		return {
			menuCenter: menuRect.top + (menuRect.height / 2),
			languageCenter: languageRect.top + (languageRect.height / 2),
			innerHeight: innerRect.height,
			headerHeight,
			rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			navDisplay: getComputedStyle(nav).display,
			direction: root.direction,
		};
	});

	expect(metrics.navDisplay).toBe('flex');
	expect(Math.abs(metrics.menuCenter - metrics.languageCenter)).toBeLessThanOrEqual(2);
	expect(metrics.innerHeight).toBeLessThanOrEqual(metrics.headerHeight + 1);
	expect(metrics.rootOverflow).toBeLessThanOrEqual(1);
});


test('Core search, buttons, and Query Pagination inherit the shared control family', async ({ page }) => {
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	await page.locator('.slateframe-prose').first().evaluate((node) => {
		const fixture = document.createElement('div');
		fixture.className = 'browser-core-control-system';
		fixture.innerHTML = '<form class="wp-block-search wp-block-search__button-outside"><div class="wp-block-search__inside-wrapper"><input class="wp-block-search__input" type="search" aria-label="Search fixture"><button class="wp-block-search__button wp-element-button" type="submit">Search</button></div></form><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#main-content">Primary action</a></div><nav class="wp-block-query-pagination"><a href="#main-content">Previous</a><span class="page-numbers current">2</span><a href="#main-content">Next</a></nav>';
		node.prepend(fixture);
	});

	const controlSize = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')));
	const controls = page.locator('.browser-core-control-system :is(.wp-block-search__input,.wp-block-search__button,.wp-block-button__link,.wp-block-query-pagination a,.wp-block-query-pagination .page-numbers)');
	for (let index = 0; index < await controls.count(); index += 1) {
		const box = await controls.nth(index).boundingBox();
		expect(box?.height || 0).toBeGreaterThanOrEqual(controlSize - 1);
	}

	const disabled = page.locator('.browser-core-control-system .wp-block-button__link');
	await disabled.evaluate((node) => node.setAttribute('aria-disabled', 'true'));
	const disabledState = await disabled.evaluate((node) => {
		const styles = getComputedStyle(node);
		return { cursor: styles.cursor, opacity: Number.parseFloat(styles.opacity) };
	});
	expect(disabledState.cursor).toBe('not-allowed');
	expect(disabledState.opacity).toBeLessThan(1);
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
