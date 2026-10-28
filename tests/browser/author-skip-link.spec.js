const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

test('author archive keyboard skip link reaches the main landmark', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  let authorUrl = await page.locator('.slateframe-byline a').first().getAttribute('href').catch(() => null);
  if (!authorUrl) {
    const firstPost = page.locator('.slateframe-card-title a').first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();
    authorUrl = await page.locator('.slateframe-byline a').first().getAttribute('href');
  }
  expect(authorUrl).toBeTruthy();
  await page.goto(authorUrl, { waitUntil: 'networkidle' });
  const main = page.locator('main#main-content');
  await expect(main).toHaveCount(1);
  await expect(main).toHaveAttribute('tabindex', '-1');
  const skip = page.locator('a.skip-link[href="#main-content"]');
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  await expect(main).toBeFocused();
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(main).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('focused skip link remains bounded and wraps at computed 400% zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress page covers seven widths');
  test.setTimeout(120000);
  await page.goto('/', { waitUntil: 'networkidle' });
  const skip = page.locator('a.skip-link[href="#main-content"]');
  await skip.evaluate(node => {
    node.textContent = 'Skip to content 日本語中文 العربية LongUnbrokenNavigationLabel';
  });
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      for (const font of width <= 412 ? [16, 32, 64] : [16, 32]) {
        await setRootTextScale(page, font, dir);
        await skip.focus();
        await expect(skip).toBeFocused();
        const state = await skip.evaluate(node => {
          const box = node.getBoundingClientRect(), style = getComputedStyle(node);
          return {
            left: box.left, right: box.right, height: box.height,
            whiteSpace: style.whiteSpace, wrap: style.overflowWrap, wordWrap: style.wordWrap,
            outline: parseFloat(style.outlineWidth),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
          };
        });
        const label = width + 'px ' + dir + ' ' + font + 'px';
        expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
        expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
        expect(state.height, label + ' target height').toBeGreaterThanOrEqual(44);
        expect(state.whiteSpace, label + ' wraps').toBe('normal');
        expect(state.wrap, label + ' long token').toBe('anywhere');
        expect(state.wordWrap, label + ' Core word-wrap alias').toBe('anywhere');
        expect(state.outline, label + ' focus').toBeGreaterThanOrEqual(2);
        expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
        if (width === 390 && font === 64) {
          await page.screenshot({ fullPage: false,
            path: 'test-artifacts/screenshots/skip-link-390-' + dir + '-400.png' });
        }
      }
    }
  }
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await skip.focus();
    await expect(skip).toBeFocused();
    const focus = await skip.evaluate(node => {
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      return {
        left: box.left, right: box.right, height: box.height,
        outline: parseFloat(style.outlineWidth), wrap: style.overflowWrap,
        wordWrap: style.wordWrap,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    expect(focus.left, width + 'px forced-colors left').toBeGreaterThanOrEqual(-1);
    expect(focus.right, width + 'px forced-colors right').toBeLessThanOrEqual(width + 1);
    expect(focus.height, width + 'px forced-colors target').toBeGreaterThanOrEqual(44);
    expect(focus.outline, width + 'px forced-colors focus').toBeGreaterThanOrEqual(2);
    expect(focus.wrap).toBe('anywhere');
    expect(focus.wordWrap).toBe('anywhere');
    expect(focus.overflow, width + 'px forced-colors overflow').toBeLessThanOrEqual(1);
    if (width === 390) {
      await page.screenshot({ fullPage: false,
        path: 'test-artifacts/screenshots/skip-link-390-rtl-400-forced-colors.png' });
    }
  }
  await skip.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator('main#main-content')).toBeFocused();
});
