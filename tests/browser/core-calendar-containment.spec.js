const { test, expect } = require('@playwright/test');
test('Core Calendar keeps its seven-column table and scrolls inside the reading column', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  // A visible article can precede the completion of its contextual stylesheet.
  // Wait for the actual WordPress reading CSS before injecting the Calendar;
  // otherwise the test intermittently observes the browser's default overflow.
  await page.waitForLoadState('load');
  const readingStyle = page.locator('link#slateframe-reading-css');
  await expect(readingStyle).toHaveAttribute('href', /\/assets\/css\/reading\.css/);
  await expect.poll(() => readingStyle.evaluate(link => link.sheet !== null)).toBe(true);
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
      expect(await calendar.locator('table').evaluate(node => getComputedStyle(node).display)).toBe('table');
      expect(await calendar.locator('th').first().evaluate(node => getComputedStyle(node).whiteSpace)).toBe('nowrap');
      expect(size.pageOverflow, width + 'px ' + dir).toBeLessThanOrEqual(1);
      if (width <= 412) {
        expect(size.scroll).toBeGreaterThan(size.client);
        const traveled = await calendar.evaluate((node, direction) => {
          node.scrollLeft = direction === 'rtl' ? -10000 : 10000;
          return Math.abs(node.scrollLeft);
        }, dir);
        expect(traveled, width + 'px ' + dir + ' calendar scroll').toBeGreaterThan(0);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  const zoomed = await calendar.evaluate(node => ({
    scroll: node.scrollWidth, client: node.clientWidth,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(zoomed.scroll).toBeGreaterThan(zoomed.client);
  expect(zoomed.pageOverflow).toBeLessThanOrEqual(1);
  await page.locator('.slateframe-prose .wp-block-calendar').last().screenshot({ path: 'test-artifacts/screenshots/core-calendar-390-rtl-200-forced-colors.png' });
});
