const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');

const projectPath = process.env.SLATEFRAME_PROJECT_PATH || '/';

test('native Core Query Pagination has bounded targets, RTL reflow and high-contrast current state', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress Portfolio fixture resized across all widths');
  test.setTimeout(120000);
  await page.goto(projectPath, { waitUntil: 'networkidle' });
  const grid = page.locator('.browser-project-grid').first();
  await expect(grid).toBeVisible();
  const pagination = grid.locator('.wp-block-query-pagination').first();
  await expect(pagination).toBeVisible();
  // WordPress may inline block styles instead of exposing a linked stylesheet.
  // Assert the actual native block presentation, not its transport mechanism.
  await expect.poll(() => pagination.locator('.page-numbers.current').evaluate(node =>
    getComputedStyle(node).fontVariantNumeric)).toContain('tabular-nums');
  const next = pagination.locator('a.wp-block-query-pagination-next');
  await expect(next).toBeVisible();
  const numbers = pagination.locator('.wp-block-query-pagination-numbers');
  await expect(numbers).toBeVisible();
  await expect(numbers.locator('.page-numbers.current')).toHaveCount(1);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  const originalNextLabel = await next.textContent();
  await next.evaluate(node => { node.textContent = 'Next 日本語 中文 العربية ' + 'UnbrokenProjectLabel'.repeat(2); });

  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
        await page.locator('html').evaluate((node, value) => {
          node.dir = value.dir;
          node.style.fontSize = value.font + 'px';
        }, { dir, font });
        const result = await pagination.evaluate((node) => {
          const controls = [...node.querySelectorAll('a,.page-numbers')]
            .filter(el => el.getClientRects().length);
          return {
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            target: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')),
            controls: controls.map(el => {
              const rect = el.getBoundingClientRect();
              return { tag: el.tagName, width: rect.width, height: rect.height, left: rect.left,
                right: rect.right, text: el.textContent.trim(), display: getComputedStyle(el).display,
                numeric: getComputedStyle(el).fontVariantNumeric };
            }),
            viewport: document.documentElement.clientWidth,
          };
        });
        const label = width + 'px ' + dir + ' ' + font + 'px';
        expect(result.controls.length, label + ' native controls').toBeGreaterThanOrEqual(3);
        expect(result.target, label + ' bounded target token').toBeGreaterThanOrEqual(44);
        expect(result.overflow, label + ' page reflow').toBeLessThanOrEqual(1);
        for (const item of result.controls) {
          expect(item.width, label + ' ' + item.text + ' width').toBeGreaterThanOrEqual(result.target - 1);
          expect(item.height, label + ' ' + item.text + ' height').toBeGreaterThanOrEqual(result.target - 1);
          expect(item.left, label + ' ' + item.text + ' left').toBeGreaterThanOrEqual(-1);
          expect(item.right, label + ' ' + item.text + ' right').toBeLessThanOrEqual(result.viewport + 1);
          expect(item.display, label + ' ' + item.text + ' display').toBe('grid');
          expect(item.numeric, label + ' ' + item.text + ' numeric alignment').toContain('tabular-nums');
        }
        if (font === 16 && [390, 1440].includes(width)) {
          await pagination.screenshot({ path: 'test-artifacts/screenshots/core-query-pagination-' + width + '-' + dir + '.png' });
        }
        if (width === 390 && dir === 'rtl' && font === 64) {
          await pagination.screenshot({ path: 'test-artifacts/screenshots/core-query-pagination-390-rtl-400.png' });
        }
      }
    }
  }

  await next.evaluate((node, label) => { node.textContent = label; }, originalNextLabel);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
  const currentBeforeForced = await numbers.locator('.page-numbers.current').evaluate(node => {
    const style = getComputedStyle(node);
    const link = node.parentElement.querySelector('a.page-numbers');
    return { active: style.backgroundColor, inactive: link ? getComputedStyle(link).backgroundColor : '' };
  });
  expect(currentBeforeForced.active).not.toBe(currentBeforeForced.inactive);
  // Apply the OS contrast preference before document load, as in the dedicated
  // native-pagination forced-colors regression. Chromium may retain adjusted
  // colors when a live page toggles the preference after extensive reflow.
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
  const current = numbers.locator('.page-numbers.current');
  const contrast = await current.evaluate(node => {
    const s = getComputedStyle(node);
    const probe = document.createElement('span');
    probe.style.color = 'Highlight';
    document.body.append(probe);
    const highlight = getComputedStyle(probe).color;
    probe.remove();
    return { outline: s.outlineStyle, width: parseFloat(s.outlineWidth),
      color: s.outlineColor, highlight, offset: parseFloat(s.outlineOffset) };
  });
  expect(contrast.outline).toBe('solid');
  expect(contrast.width).toBeGreaterThanOrEqual(2);
  expect(contrast.color).toBe(contrast.highlight);
  expect(contrast.offset).toBe(0);
  await next.focus();
  await expect(next).toBeFocused();
  const focus = await next.evaluate(node => ({
    visible: node.matches(':focus-visible'),
    width: parseFloat(getComputedStyle(node).outlineWidth),
  }));
  expect(focus.visible).toBe(true);
  expect(focus.width).toBeGreaterThanOrEqual(2);
  const a11y = await new AxeBuilder({ page }).include('.browser-project-grid .wp-block-query-pagination')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
  await pagination.screenshot({ path: 'test-artifacts/screenshots/core-query-pagination-390-rtl-200-forced-colors.png' });

  await page.emulateMedia({ forcedColors: 'none' });
  await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = ''; });
  await next.click();
  const pageTwo = page.locator('.browser-project-grid .wp-block-query-pagination').first();
  await expect(pageTwo.locator('a.wp-block-query-pagination-previous')).toBeVisible();
  await expect(pageTwo.locator('.page-numbers.current')).toHaveText('2');
  const back = pageTwo.locator('a.wp-block-query-pagination-previous');
  const box = await back.boundingBox();
  expect(box?.width || 0).toBeGreaterThanOrEqual(44);
  expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  await back.click();
  await expect(page.locator('.browser-project-grid .wp-block-query-pagination .page-numbers.current')).toHaveText('1');
});

test('Core Query Pagination retains native emphasis without the Portfolio presentation wrapper', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress fixture exercises generic Core styling');
  await page.goto(projectPath, { waitUntil: 'networkidle' });
  const wrapper = page.locator('.browser-project-grid').first();
  await expect(wrapper).toBeVisible();
  await wrapper.evaluate(node => node.classList.remove('slateframe-project-grid'));
  const nav = wrapper.locator('.wp-block-query-pagination').first();
  const current = nav.locator('.page-numbers.current');
  const next = nav.locator('a.wp-block-query-pagination-next');
  await expect(current).toBeVisible();
  await expect(next).toBeVisible();
  for (const direction of ['ltr', 'rtl']) {
    await page.locator('html').evaluate((node, dir) => { node.dir = dir; node.style.fontSize = '32px'; }, direction);
    const state = await current.evaluate(node => {
      const css = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return { background: css.backgroundColor, color: css.color, numerals: css.fontVariantNumeric,
        width: box.width, height: box.height, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(state.background, direction + ' selected background').not.toBe('rgba(0, 0, 0, 0)');
    expect(state.numerals, direction + ' tabular numerals').toContain('tabular-nums');
    expect(state.width, direction + ' current target').toBeGreaterThanOrEqual(44);
    expect(state.height, direction + ' current target').toBeGreaterThanOrEqual(44);
    expect(state.overflow, direction + ' reflow').toBeLessThanOrEqual(1);
    const nextBox = await next.boundingBox();
    expect(nextBox?.width || 0).toBeGreaterThanOrEqual(44);
    expect(nextBox?.height || 0).toBeGreaterThanOrEqual(44);
  }
});
