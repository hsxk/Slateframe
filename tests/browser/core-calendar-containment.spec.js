const { test, expect } = require('@playwright/test');
test('Core Calendar keeps its seven-column table and scrolls inside the reading column', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  const prose = page.locator('.slateframe-prose').first();
  await expect(prose).toBeVisible();
  await prose.evaluate(root => {
    const calendar = document.createElement('div');
    calendar.className = 'wp-block-calendar';
    const cells = Array.from({ length: 7 }, (_, i) => '<th scope="col">Weekday ' + i + '</th>').join('');
    calendar.innerHTML = '<table><caption>October 2026</caption><thead><tr>' + cells + '</tr></thead><tbody><tr><td colspan="7">1</td></tr></tbody></table>';
    root.append(calendar);
  });
  await page.addStyleTag({ content: '.wp-block-calendar table{min-inline-size:700px}' });
  const calendar = page.locator('.slateframe-prose .wp-block-calendar').last();
  await expect(calendar.locator('th[scope="col"]')).toHaveCount(7);
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      const size = await calendar.evaluate(element => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
        overflow: getComputedStyle(element).overflowX,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(size.overflow).toBe('auto');
      expect(size.pageOverflow, width + 'px ' + dir).toBeLessThanOrEqual(1);
      if (width <= 412) expect(size.scroll).toBeGreaterThan(size.client);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});