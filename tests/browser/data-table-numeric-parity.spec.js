const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');
test('Core data table numerals survive seven widths, RTL, zoom and forced colors', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  const prose = page.locator('.slateframe-prose').first();
  await expect(prose).toBeVisible();
  await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href?.includes('/assets/css/reading.css') && sheet.cssRules.length > 0));
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await prose.evaluate(root => root.insertAdjacentHTML('beforeend',
    '<figure class="wp-block-table is-style-slateframe-data"><table><tbody><tr><td>1234567890</td></tr></tbody></table></figure>'));
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      for (const pixels of width === 390 ? [16, 32, 64] : [16, 32]) {
        await setRootTextScale(page, pixels, dir);
        for (const selector of ['.slateframe-prose .wp-block-table', '.slateframe-prose .wp-block-table table', '.slateframe-prose .wp-block-table td']) {
          const numeric = await page.locator(selector).last().evaluate(node => getComputedStyle(node).fontVariantNumeric);
          expect(numeric, width + 'px ' + dir + ' ' + pixels + 'px ' + selector).toContain('tabular-nums');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
          width + 'px ' + dir + ' ' + pixels + 'px').toBeLessThanOrEqual(1);
        if (width === 390 && pixels === 64) {
          await page.locator('.slateframe-prose .wp-block-table').last().screenshot({
            path: 'test-artifacts/screenshots/core-data-table-390-' + dir + '-400.png',
          });
        }
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await setRootTextScale(page, 16, 'rtl');
  await page.locator('.slateframe-prose .wp-block-table').last().screenshot({ path: 'test-artifacts/screenshots/core-data-table-rtl.png' });
  await setRootTextScale(page, 32, 'rtl');
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await page.locator('.slateframe-prose .wp-block-table td').last().evaluate(node => getComputedStyle(node).fontVariantNumeric)).toContain('tabular-nums');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.slateframe-prose .wp-block-table').last().screenshot({ path: 'test-artifacts/screenshots/core-data-table-390-rtl-200-forced-colors.png' });
  await setRootTextScale(page, 64, 'rtl');
  expect(await page.locator('.slateframe-prose .wp-block-table td').last().evaluate(node => getComputedStyle(node).fontVariantNumeric)).toContain('tabular-nums');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.slateframe-prose .wp-block-table').last().screenshot({ path: 'test-artifacts/screenshots/core-data-table-390-rtl-400-forced-colors.png' });
});
