const { test, expect } = require('@playwright/test');

test('Core Calendar translated headings remain readable at mobile zoom and in RTL', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  // The article may become visible before its WordPress reading stylesheet loads.
  // Assert against the fully loaded Core presentation, not an in-flight navigation.
  await page.waitForLoadState('load');
  const readingStyle = page.locator('link#slateframe-reading-css');
  await expect(readingStyle).toHaveAttribute('href', /\/assets\/css\/reading\.css/);
  await expect.poll(() => readingStyle.evaluate(link => link.sheet !== null)).toBe(true);
  const prose = page.locator('.slateframe-prose').first();
  await expect(prose).toBeVisible();
  await prose.evaluate(root => {
    const labels = ['月曜日', '火曜日', '水曜日', '木曜日', 'الجمعة', 'Saturday', 'Sunday'];
    const wrapper = document.createElement('div');
    wrapper.className = 'wp-block-calendar slateframe-calendar-localization-fixture';
    wrapper.innerHTML = '<table><caption>2026年10月</caption><thead><tr>' +
      labels.map(label => '<th scope="col">' + label + '</th>').join('') +
      '</tr></thead><tbody><tr>' + labels.map((label, index) => '<td><a href="#calendar-end">' + (index + 1) + '</a></td>').join('') + '</tr></tbody></table>';
    root.append(wrapper);
  });
  await page.addStyleTag({ content: '.slateframe-calendar-localization-fixture table{min-inline-size:700px}' });
  const calendar = page.locator('.slateframe-calendar-localization-fixture');
  await expect(calendar.locator('th[scope="col"]')).toHaveCount(7);
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(direction => { document.documentElement.dir = direction; }, dir);
      const result = await calendar.evaluate(node => ({
        display: getComputedStyle(node.querySelector('table')).display,
        nowrap: [...node.querySelectorAll('th')].every(th => getComputedStyle(th).whiteSpace === 'nowrap'),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(result.display).toBe('table');
      expect(result.nowrap, width + 'px ' + dir).toBe(true);
      expect(result.pageOverflow, width + 'px ' + dir).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await calendar.locator('td a').last().focus();
  expect(Math.abs(await calendar.evaluate(node => node.scrollLeft))).toBeGreaterThan(0);
  await page.keyboard.press('Shift+Tab');
  await expect(calendar.locator('td a').nth(5)).toBeFocused();
  expect(await calendar.locator('td a').nth(5).evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  const zoomed = await calendar.evaluate(node => ({
    client: node.clientWidth, scroll: node.scrollWidth,
    nowrap: [...node.querySelectorAll('th')].every(th => getComputedStyle(th).whiteSpace === 'nowrap'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(zoomed.nowrap).toBe(true);
  expect(zoomed.scroll).toBeGreaterThan(zoomed.client);
  expect(zoomed.overflow).toBeLessThanOrEqual(1);
  await calendar.screenshot({ path: 'test-artifacts/screenshots/core-calendar-localization-390-rtl-200-forced-colors.png' });
});
