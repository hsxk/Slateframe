const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

// Exercise actual WordPress listing and author routes, never a synthetic DOM.
test('listing headings preserve mixed-script isolation across viewport and zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture exercises the matrix');
  test.setTimeout(180000);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  for (const surface of [
    { route: '/', label: 'index' },
    { route: '/?author=1', label: 'author' },
  ]) {
    await page.goto(surface.route, { waitUntil: 'networkidle' });
    const title = page.locator('.slateframe-page-header .slateframe-page-title').first();
    await expect(title, surface.label + ' title').toBeVisible();
    const isolated = title.locator(':scope > bdi');
    await expect(isolated).toHaveCount(1);
    expect(await isolated.evaluate(node => getComputedStyle(node).unicodeBidi)).toBe('isolate');
    await isolated.evaluate(node => {
      node.textContent = '日本語 中文 العربية — ' + 'LongUnbrokenListingName'.repeat(4);
    });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const geometry = await title.evaluate(node => {
            const rect = node.getBoundingClientRect();
            return {
              left: rect.left, right: rect.right,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
          });
          const label = surface.label + ' ' + width + 'px ' + direction + ' ' + font + 'px';
          expect(geometry.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(geometry.left, label + ' left edge').toBeGreaterThanOrEqual(-1);
          expect(geometry.right, label + ' right edge').toBeLessThanOrEqual(width + 1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await title.scrollIntoViewIfNeeded();
    const axe = await new AxeBuilder({ page }).include('.slateframe-page-header')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations, surface.label).toEqual([]);
    await page.screenshot({ path: 'test-artifacts/screenshots/listing-bidi-' + surface.label + '-390-rtl-400.png' });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.screenshot({ path: 'test-artifacts/screenshots/listing-bidi-' + surface.label + '-390-rtl-400-forced-colors.png' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await page.screenshot({ path: 'test-artifacts/screenshots/listing-bidi-' + surface.label + '-1440-ltr.png' });
  }
});
