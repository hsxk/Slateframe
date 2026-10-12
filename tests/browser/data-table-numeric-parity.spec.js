const { test, expect } = require('@playwright/test');
test('Core data table cells retain tabular numerals in frontend and RTL', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  const prose = page.locator('.slateframe-prose').first();
  await expect(prose).toBeVisible();
  await prose.evaluate(root => root.insertAdjacentHTML('beforeend',
    '<figure class="wp-block-table is-style-slateframe-data"><table><tbody><tr><td>1234567890</td></tr></tbody></table></figure>'));
  for (const dir of ['ltr', 'rtl']) {
    await page.evaluate(value => { document.documentElement.dir = value; }, dir);
    for (const selector of ['.slateframe-prose .wp-block-table', '.slateframe-prose .wp-block-table table', '.slateframe-prose .wp-block-table td']) {
      const numeric = await page.locator(selector).last().evaluate(node => getComputedStyle(node).fontVariantNumeric);
      expect(numeric, dir + ' ' + selector).toContain('tabular-nums');
    }
  }
  await page.locator('.slateframe-prose .wp-block-table').last().screenshot({ path: 'test-artifacts/screenshots/core-data-table-rtl.png' });
});
