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

test('display titles use a script-neutral measure for long CJK strings', async ({ page }) => {
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
			maxMeasure: Number.parseFloat(styles.maxWidth) / Number.parseFloat(styles.fontSize),
			right: rect.right,
			viewport: document.documentElement.clientWidth,
			rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		};
	});

	expect(metrics.maxMeasure).toBeGreaterThan(13.5);
	expect(metrics.maxMeasure).toBeLessThan(14.5);
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
});

test('mobile navigation stays inside the viewport when content grows', async ({ page }, testInfo) => {
	const viewportWidth = testInfo.project.use.viewport?.width || 1440;
	test.skip(viewportWidth > 900, 'Mobile navigation contract.');

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
