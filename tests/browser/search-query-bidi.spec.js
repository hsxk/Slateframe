const { test, expect } = require('@playwright/test');

// WordPress get_search_query() defaults to attribute-escaped output; the
// template must request the raw query and escape it once for each context.
test('Search query keeps ampersands and quotes readable without HTML injection', async ({ page }) => {
  const query = 'R&D "日本語" مرحبا';
  await page.goto('/?s=' + encodeURIComponent(query), { waitUntil: 'networkidle' });
  const heading = page.locator('.slateframe-page-title').first();
  const isolated = heading.locator('bdi');
  const searchInput = page.locator('.slateframe-search-form input[name="s"]').first();
  await expect(isolated).toHaveText(query);
  await expect(searchInput).toHaveValue(query);
  expect(await heading.textContent()).not.toContain('&amp;');
  await expect(page.locator('.slateframe-search-form')).toHaveAttribute('method', 'get');
  expect(await page.locator('.slateframe-search-form').evaluate(node => new FormData(node).get('s'))).toBe(query);
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});

test('Search heading isolates Arabic-leading query from surrounding translation', async ({ page }) => {
  const query = 'مرحبا R&D 日本語';
  await page.goto('/?s=' + encodeURIComponent(query), { waitUntil: 'networkidle' });
  const isolated = page.locator('.slateframe-page-title bdi');
  await expect(isolated).toHaveText(query);
  expect(await isolated.evaluate(node => getComputedStyle(node).direction)).toBe('rtl');
  await expect(page.locator('.slateframe-search-form input[name="s"]')).toHaveValue(query);
});
