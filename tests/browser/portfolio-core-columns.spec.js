const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { settlePortfolioImagesForEvidence } = require('./visual-evidence');
const projectPath = process.env.SLATEFRAME_PROJECT_PATH;
const width = (info) => info.project.use.viewport?.width || 0;
const columns = (chosen, w) => w <= 640 ? 1 : w <= 900 ? Math.min(2, chosen) : chosen;
const zoomColumns = (chosen, viewport, containerWidth, rootPx) => containerWidth <= 35 * rootPx ? 1 : columns(chosen, viewport);

async function openTemplate(page) {
  await page.goto(projectPath, { waitUntil: 'domcontentloaded' });
  const list = page.locator('.slateframe-project-grid .wp-block-post-template').first();
  await expect(list).toBeVisible();
  await expect(list.locator(':scope > .wp-block-post').first()).toBeVisible();
  return list;
}
async function metrics(list) {
  return list.evaluate((node) => ({
    display: getComputedStyle(node).display,
    tracks: getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
}

test('Core Query Loop respects columns 1–6 and mobile/tablet caps', async ({ page }, info) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  const list = await openTemplate(page);
  for (const chosen of [1, 2, 3, 4, 5, 6]) {
    await list.evaluate((node, count) => {
      for (const name of [...node.classList]) if (/^columns-[1-6]$/.test(name)) node.classList.remove(name);
      node.classList.add('columns-' + count);
    }, chosen);
    const actual = await metrics(list);
    expect(actual.display).toBe('grid');
    expect(actual.tracks, 'viewport ' + width(info) + ', columns ' + chosen).toBe(columns(chosen, width(info)));
    expect(actual.overflow).toBeLessThanOrEqual(1);
  }
});

test('Core is-layout-grid remains authoritative', async ({ page }) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  const list = await openTemplate(page);
  await list.evaluate((node) => {
    node.classList.remove('is-flex-container');
    node.classList.add('is-layout-grid');
    node.style.display = 'grid';
    node.style.gridTemplateColumns = 'repeat(2,minmax(0,1fr))';
  });
  const actual = await metrics(list);
  expect(actual.tracks).toBe(2);
  expect(actual.overflow).toBeLessThanOrEqual(1);
  await page.locator('html').evaluate(node => { node.style.setProperty('font-size', '64px', 'important'); });
  expect(await page.locator('html').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeCloseTo(64, 1);
  expect((await metrics(list)).tracks, 'authored Core Grid must survive 400%').toBe(2);
});

test('RTL/CJK and 200% text enlargement preserve grid boundaries', async ({ page }, info) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  const list = await openTemplate(page);
  await page.locator('html').evaluate((node) => { node.dir = 'rtl'; node.style.setProperty('font-size', '32px', 'important'); });
  await list.evaluate((node) => {
    for (const name of [...node.classList]) if (/^columns-[1-6]$/.test(name)) node.classList.remove(name);
    node.classList.add('columns-6');
    node.querySelectorAll('.wp-block-post-title a').forEach((a) => {
      a.textContent = '日本語 العربية ' + 'unbroken-project-identifier-'.repeat(4);
    });
  });
  const actual = await metrics(list);
  const zoom = await list.evaluate(node => ({
    rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
    containerWidth: parseFloat(getComputedStyle(node.closest('.slateframe-project-grid')).width),
  }));
  expect(zoom.rootPx, 'real 200% computed font size').toBeCloseTo(32, 1);
  expect(actual.tracks).toBe(zoomColumns(6, width(info), zoom.containerWidth, zoom.rootPx));
  expect(actual.overflow).toBeLessThanOrEqual(1);
});

test('default-size Portfolio preserves 641–900px authored tablet columns near container gutters', async ({ page }, info) => {
  test.skip(width(info) !== 390 || !projectPath, 'One real WordPress fixture covers the gutter boundary');
  const list = await openTemplate(page);
  await settlePortfolioImagesForEvidence(page);
  for (const viewport of [641, 650, 680, 720, 768, 900]) {
    await page.setViewportSize({ width: viewport, height: 900 });
    for (const direction of ['ltr', 'rtl']) {
      await page.locator('html').evaluate((node, dir) => {
        node.dir = dir;
        node.style.setProperty('font-size', '16px', 'important');
      }, direction);
      for (const chosen of [1, 2, 3, 4, 5, 6]) {
        await list.evaluate((node, count) => {
          for (const name of [...node.classList]) {
            if (/^columns-[1-6]$/.test(name)) node.classList.remove(name);
          }
          node.classList.add('columns-' + count);
        }, chosen);
        const actual = await metrics(list);
        const label = viewport + 'px ' + direction + ' authored columns-' + chosen;
        expect(actual.tracks, label + ' must retain Core tablet choice').toBe(columns(chosen, viewport));
        expect(actual.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
        if (viewport === 680 && chosen === 3) {
          const fs = require('node:fs/promises');
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await list.screenshot({
            path: 'test-artifacts/screenshots/portfolio-reflow-680-' + direction + '-default.png',
            animations: 'disabled',
          });
          if (direction === 'ltr') {
            await page.screenshot({
              path: 'test-artifacts/screenshots/portfolio-reflow-680-ltr-full-page.png',
              fullPage: true,
              animations: 'disabled',
            });
          }
        }
      }
    }
  }
});

test('Portfolio native flex columns reflow at 400% without overriding Core Grid', async ({ page }, info) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  test.setTimeout(120000);
  const list = await openTemplate(page);
  await settlePortfolioImagesForEvidence(page);
  const viewport = width(info);
  for (const dir of ['ltr', 'rtl']) {
    await page.locator('html').evaluate((node, direction) => {
      node.dir = direction;
      node.style.setProperty('font-size', '64px', 'important');
    }, dir);
    for (const chosen of [1, 2, 3, 4, 5, 6]) {
      await list.evaluate((node, count) => {
        for (const name of [...node.classList]) {
          if (/^columns-[1-6]$/.test(name)) node.classList.remove(name);
        }
        node.classList.add('columns-' + count);
        node.querySelectorAll('.wp-block-post-title a').forEach(link => {
          link.textContent = '日本語 中文 العربية ' + 'UnbrokenProjectIdentifier'.repeat(3);
        });
      }, chosen);
      const state = await list.evaluate(node => ({
        rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
        containerWidth: parseFloat(getComputedStyle(node.closest('.slateframe-project-grid')).width),
        containerName: getComputedStyle(node.closest('.slateframe-project-grid')).containerName,
        tracks: getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        boxes: [...node.querySelectorAll(':scope > .wp-block-post')].map(card => {
          const box = card.getBoundingClientRect();
          return { left: box.left, right: box.right, width: box.width };
        }),
      }));
      const label = viewport + 'px ' + dir + ' columns-' + chosen + ' 400%';
      expect(state.rootPx, label + ' real 400% font size').toBeCloseTo(64, 1);
      expect(state.containerName, label + ' named container').toBe('slateframe-portfolio');
      expect(state.tracks, label + ' readable tracks').toBe(zoomColumns(chosen, viewport, state.containerWidth, state.rootPx));
      expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
      for (const box of state.boxes) {
        expect(box.left, label + ' card left').toBeGreaterThanOrEqual(-1);
        expect(box.right, label + ' card right').toBeLessThanOrEqual(viewport + 1);
        expect(box.width, label + ' card width').toBeGreaterThan(0);
      }
    }
    const link = list.locator('.wp-block-post-title a').first();
    await link.focus();
    await expect(link).toBeFocused();
    const target = await link.boundingBox();
    expect(target.width).toBeGreaterThanOrEqual(43);
    expect(target.height).toBeGreaterThanOrEqual(43);
    if ([320, 375, 390, 412, 768, 1440, 1920].includes(viewport)) {
      await link.evaluate(node => node.blur());
      const fs = require('node:fs/promises');
      await fs.mkdir('test-artifacts/screenshots', { recursive: true });
      await list.screenshot({
        path: 'test-artifacts/screenshots/portfolio-reflow-' + viewport + '-' + dir + '-400.png',
        animations: 'disabled',
      });
      if (dir === 'ltr' && [390, 1440].includes(viewport)) {
        await page.screenshot({
          path: 'test-artifacts/screenshots/portfolio-reflow-' + viewport + '-ltr-400-full-page.png',
          fullPage: true,
          animations: 'disabled',
        });
      }
    }
    if (viewport === 390 && dir === 'rtl') {
      const axe = await new AxeBuilder({ page }).include('.slateframe-project-grid')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(axe.violations).toEqual([]);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await link.focus();
      const outline = await link.evaluate(node => ({
        style: getComputedStyle(node).outlineStyle,
        width: parseFloat(getComputedStyle(node).outlineWidth),
      }));
      expect(outline.style).not.toBe('none');
      expect(outline.width).toBeGreaterThanOrEqual(2);
      await list.screenshot({
        path: 'test-artifacts/screenshots/portfolio-reflow-390-rtl-400-forced-colors.png',
        animations: 'disabled',
      });
      await page.screenshot({
        path: 'test-artifacts/screenshots/portfolio-reflow-390-rtl-400-forced-colors-full-page.png',
        fullPage: true,
        animations: 'disabled',
      });
      await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    }
  }
});

test('native Core pagination keeps 44px targets in RTL and enlarged text', async ({ page }) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  await openTemplate(page);
  const nav = page.locator('.slateframe-project-grid .wp-block-query-pagination').first();
  await expect(nav).toBeVisible();
  for (const direction of ['ltr', 'rtl']) {
    for (const size of [16, 32]) {
      await page.locator('html').evaluate((root, state) => {
        root.dir = state.direction;
        root.style.setProperty('font-size', state.size + 'px', 'important');
      }, { direction, size });
      const metrics = await nav.evaluate((node) => ({
        rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
        minTarget: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')),
        links: [...node.querySelectorAll('a[href]')].map((link) => {
          const box = link.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
        current: [...node.querySelectorAll('.page-numbers.current')].map((item) => ({
          tag: item.tagName, tabIndex: item.tabIndex,
        })),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(metrics.rootPx, 'pagination actual zoom').toBeCloseTo(size, 1);
      expect(metrics.minTarget).toBeGreaterThanOrEqual(44);
      expect(metrics.links.length).toBeGreaterThan(0);
      expect(metrics.current.length).toBeGreaterThan(0);
      for (const link of metrics.links) {
        expect(link.width).toBeGreaterThanOrEqual(metrics.minTarget - 1);
        expect(link.height).toBeGreaterThanOrEqual(metrics.minTarget - 1);
      }
      for (const item of metrics.current) {
        expect(item.tag).not.toBe('A');
        expect(item.tabIndex).toBe(-1);
      }
      expect(metrics.overflow).toBeLessThanOrEqual(1);
    }
  }
});

test('native Core pagination navigates to a different real Portfolio page', async ({ page }) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  await openTemplate(page);
  const nav = page.locator('.slateframe-project-grid .wp-block-query-pagination').first();
  await expect(nav).toBeVisible();
  const before = await page.locator('.slateframe-project-grid .wp-block-post-title').allTextContents();
  const link = nav.locator('a[href]').first();
  const destination = await link.getAttribute('href');
  expect(destination).toBeTruthy();
  await link.click();
  await expect(page.locator('.slateframe-project-grid .wp-block-post-template').first()).toBeVisible();
  const after = await page.locator('.slateframe-project-grid .wp-block-post-title').allTextContents();
  expect(after).not.toEqual(before);
});
