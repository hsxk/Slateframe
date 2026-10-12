const { test, expect } = require('@playwright/test');
test('Core data table numerals survive seven widths, RTL, zoom and forced colors', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  const prose = page.locator('.slateframe-prose').first();
  await expect(prose).toBeVisible();
  await prose.evaluate(root => root.insertAdjacentHTML('beforeend',
    '<figure class="wp-block-table is-style-slateframe-data"><table><tbody><tr><td>1234567890</td></tr></tbody></table></figure>'));
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      for (const selector of ['.slateframe-prose .wp-block-table', '.slateframe-prose .wp-block-table table', '.slateframe-prose .wp-block-table td']) {
        const numeric = await page.locator(selector).last().evaluate(node => getComputedStyle(node).fontVariantNumeric);
        expect(numeric, width + 'px ' + dir + ' ' + selector).toContain('tabular-nums');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), width + 'px ' + dir).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await page.locator('.slateframe-prose .wp-block-table').last().screenshot({ path: 'test-artifacts/screenshots/core-data-table-rtl.png' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await page.locator('.slateframe-prose .wp-block-table td').last().evaluate(node => getComputedStyle(node).fontVariantNumeric)).toContain('tabular-nums');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.slateframe-prose .wp-block-table').last().screenshot({ path: 'test-artifacts/screenshots/core-data-table-390-rtl-200-forced-colors.png' });
});
