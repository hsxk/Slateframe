const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

test('Core lightbox controls expose a visible keyboard focus ring', async ({ page }, info) => {
  await page.goto('/', { waitUntil: 'networkidle' });
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
      await page.keyboard.press('Tab');
      for (const index of [1, 2]) {
        const button = controls.nth(index);
        await expect(button).toBeFocused();
        const style = await button.evaluate(node => {
          const computed = getComputedStyle(node);
          return { outlineStyle: computed.outlineStyle, outlineWidth: parseFloat(computed.outlineWidth), outlineColor: computed.outlineColor, size: node.getBoundingClientRect().width };
        });
        expect(style.outlineStyle, width + 'px ' + direction + ' focus style').not.toBe('none');
        expect(style.outlineWidth, width + 'px ' + direction + ' focus width').toBeGreaterThanOrEqual(2);
        expect(style.size, width + 'px ' + direction + ' control size').toBeGreaterThanOrEqual(44);
        if (index === 1) await page.keyboard.press('Tab');
      }
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
