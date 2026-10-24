const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const path = require('node:path');

test('classic WordPress search reflows at 400% zoom', async ({ page }, info) => {
  const viewport = Number(info.project.name.replace('viewport-', ''));
  await page.goto('/?s=Portable', { waitUntil: 'domcontentloaded' });
  const form = page.locator('form.slateframe-search-form').first();
  await expect(form).toBeVisible();
  const button = form.locator('button[type=submit]');
  const input = form.locator('input[name=s]');
  await form.evaluate(node => { node.dataset.slateframeSearchZoomTest = 'true'; });
  await button.evaluate(node => { node.textContent = '搜索文章 / Search articles / البحث'; });
  await input.fill('portable');
  expect(await form.evaluate(node => new FormData(node).get('s'))).toBe('portable');
  for (const direction of ['ltr', 'rtl']) {
    for (const fontSize of [16, 32, 64]) {
      await page.locator('html').evaluate((root, { direction, fontSize }) => {
        root.dir = direction;
        root.style.fontSize = fontSize + 'px';
      }, { direction, fontSize });
      const result = await form.evaluate(node => {
        const a = node.getBoundingClientRect();
        const b = node.querySelector('button').getBoundingClientRect();
        const inputRect = node.querySelector('input[name=s]').getBoundingClientRect();
        return { display: getComputedStyle(node).display, formWidth: a.width,
          buttonWidth: b.width, buttonHeight: b.height,
          buttonLeft: b.left, buttonRight: b.right,
          formLeft: a.left, formRight: a.right,
          inputWidth: inputRect.width,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      expect(result.overflow, `${viewport}px ${direction} ${fontSize}px overflow`).toBeLessThanOrEqual(1);
      expect(result.buttonHeight).toBeGreaterThanOrEqual(44);
      expect(result.buttonLeft).toBeGreaterThanOrEqual(result.formLeft - 1);
      expect(result.buttonRight).toBeLessThanOrEqual(result.formRight + 1);
      expect(result.inputWidth).toBeGreaterThanOrEqual(44);
      if (viewport <= 412) {
        expect(result.display).toBe('grid');
        expect(result.buttonWidth).toBeGreaterThanOrEqual(result.formWidth - 1);
      }
      if (fontSize === 64 && viewport >= 768) {
        expect(result.buttonWidth, `${viewport}px ${direction} readable 400% action`)
          .toBeGreaterThanOrEqual(result.formWidth * 0.8);
      }
    }
  }
  if (![320, 390, 768, 1440, 1920].includes(viewport)) return;
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.locator('html').evaluate(root => { root.dir = 'rtl'; root.style.fontSize = '64px'; });
  await input.focus();
  await expect(input).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  expect(await button.evaluate(node => node.matches(':focus-visible'))).toBe(true);
  expect(await button.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  const axe = await new AxeBuilder({ page }).include('[data-slateframe-search-zoom-test="true"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  const screenshotDir = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });
  await form.screenshot({ path: path.join(screenshotDir, `search-large-text-rtl-forced-colors-${viewport}.png`) });
});
