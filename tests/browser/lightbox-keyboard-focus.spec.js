const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

test('Core lightbox controls expose a visible keyboard focus ring', async ({ page }, info) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  // The homepage does not enqueue photography.css; load the real distributable
  // stylesheet for this isolated Core-control fixture, not a test-only mock.
  await page.addStyleTag({ url: '/wp-content/themes/slateframe/assets/css/photography.css' });
  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.className = 'wp-lightbox-overlay active';
    overlay.id = 'slateframe-lightbox-focus-fixture';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;padding:4rem;display:flex;gap:1rem;align-items:flex-start';
    overlay.innerHTML = '<button type="button" class="wp-lightbox-close-button" aria-label="Close">×</button><button type="button" class="wp-lightbox-navigation-button-prev" aria-label="Previous">‹</button><button type="button" class="wp-lightbox-navigation-button-next" aria-label="Next">›</button>';
    document.body.append(overlay);
  });
  const controls = page.locator('#slateframe-lightbox-focus-fixture button');
  await expect(controls).toHaveCount(3);
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const direction of ['ltr', 'rtl']) {
      await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
      await controls.first().focus();
      await expect(controls.first()).toBeFocused();
      await page.keyboard.press('Tab');
      for (const index of [1, 2]) {
        const button = controls.nth(index);
        await expect(button).toBeFocused();
        const style = await button.evaluate(node => {
          const computed = getComputedStyle(node);
          return { outlineStyle: computed.outlineStyle, outlineWidth: parseFloat(computed.outlineWidth), outlineColor: computed.outlineColor, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height };
        });
        expect(style.outlineStyle, width + 'px ' + direction + ' focus style').not.toBe('none');
        expect(style.outlineWidth, width + 'px ' + direction + ' focus width').toBeGreaterThanOrEqual(2);
        expect(style.width, width + 'px ' + direction + ' control width').toBeGreaterThanOrEqual(44);
        expect(style.height, width + 'px ' + direction + ' control height').toBeGreaterThanOrEqual(44);
        const bounds = await button.boundingBox();
        expect(bounds, width + 'px ' + direction + ' control bounds').not.toBeNull();
        expect(bounds.x, width + 'px ' + direction + ' left edge').toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width, width + 'px ' + direction + ' right edge').toBeLessThanOrEqual(width);
        if (index === 1) await page.keyboard.press('Tab');
      }
      // Every interactive control, including Close, must remain inside the viewport.
      for (let index = 0; index < 3; index++) {
        const bounds = await controls.nth(index).boundingBox();
        expect(bounds, width + 'px ' + direction + ' control ' + index).not.toBeNull();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
      }
      // Reverse keyboard navigation must restore focus to the previous control.
      await page.keyboard.press('Shift+Tab');
      await expect(controls.nth(1)).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(controls.first()).toBeFocused();
      const closeFocus = await controls.first().evaluate(node => getComputedStyle(node));
      expect(closeFocus.outlineStyle, width + 'px ' + direction + ' close focus').not.toBe('none');
      expect(parseFloat(closeFocus.outlineWidth)).toBeGreaterThanOrEqual(2);
    }
  }
  await page.setViewportSize({ width: info.project.use.viewport?.width || 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  await controls.first().focus();
  await page.keyboard.press('Tab');
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.locator('#slateframe-lightbox-focus-fixture').screenshot({ path: 'test-artifacts/screenshots/lightbox-keyboard-focus.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(controls.nth(1)).toBeFocused();
  const forced = await controls.nth(1).evaluate(node => getComputedStyle(node).outlineStyle);
  expect(forced).not.toBe('none');
  await page.locator('#slateframe-lightbox-focus-fixture').screenshot({ path: 'test-artifacts/screenshots/lightbox-keyboard-focus-forced-colors.png' });
});
