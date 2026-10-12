const { test, expect } = require('@playwright/test');
test('Spatial System calc values survive computed-value substitution', async ({ page }) => {
  // Reading styles are intentionally limited to singular WordPress content.
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('link[rel="stylesheet"][href*="/assets/css/reading.css"]')).toHaveCount(0);
  const firstPost = page.locator('.slateframe-card-title a').first();
  await expect(firstPost).toBeVisible();
  await firstPost.click();
  await expect(page.locator('link[rel="stylesheet"][href*="/assets/css/reading.css"]')).toHaveCount(1);
  await expect(page.locator('.slateframe-prose').first()).toBeVisible();
  await page.addStyleTag({ content: ':root{--slateframe-stack-gap:24px;--slateframe-header-height:72px;--slateframe-section-max:160px}' });
  await page.locator('body').evaluate(body => {
    const fixture = document.createElement('section');
    fixture.className = 'slateframe-spatial-calc-fixture';
    fixture.innerHTML = '<div class="slateframe-entry-hero"></div><nav class="slateframe-pagination"></nav><div class="slateframe-prose"><h2>Anchor</h2></div>';
    body.append(fixture);
  });
  const measure = async () => page.locator('.slateframe-spatial-calc-fixture').evaluate(root => ({
    hero: parseFloat(getComputedStyle(root.querySelector('.slateframe-entry-hero')).marginBlockEnd),
    pagination: parseFloat(getComputedStyle(root.querySelector('.slateframe-pagination')).marginBlockStart),
    heading: parseFloat(getComputedStyle(root.querySelector('h2')).scrollMarginBlockStart),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      const m = await measure();
      expect(m.hero, width + 'px ' + dir + ' hero').toBeGreaterThanOrEqual(48);
      expect(m.pagination).toBe(48);
      expect(m.heading).toBe(96);
      expect(m.overflow).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  const zoomed = await measure();
  expect(zoomed.pagination).toBe(48);
  expect(zoomed.heading).toBe(96);
  expect(zoomed.overflow).toBeLessThanOrEqual(1);
  await page.locator('.slateframe-spatial-calc-fixture').screenshot({ path: 'test-artifacts/screenshots/spatial-calc-390-rtl-200-forced-colors.png' });
});
