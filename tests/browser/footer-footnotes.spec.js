const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const projectWidth = info => info.project.use.viewport?.width || 1440;

test('Core Footnotes preserve numbering without changing footer navigation', async ({ page }, info) => {
  test.skip(![390, 1440].includes(projectWidth(info)), 'Representative mobile and desktop evidence');
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.slateframe-site-footer').evaluate(footer => {
    const section = document.createElement('section');
    section.className = 'slateframe-footer-widget slateframe-footnotes-fixture';
    section.innerHTML = '<h2>Footnotes</h2><ol class="wp-block-footnotes"><li id="fn-one">First reference <a href="#ref-one">↩</a></li><li id="fn-two">Second reference</li></ol><nav aria-label="Footer navigation"><ul class="menu"><li><a href="#navigation">Navigation</a></li></ul></nav>';
    footer.prepend(section);
  });
  const fixture = page.locator('.slateframe-footnotes-fixture');
  const footnotes = fixture.locator('ol.wp-block-footnotes');
  const menu = fixture.locator('nav ul.menu');
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      expect(await footnotes.evaluate(node => getComputedStyle(node).listStyleType), `${width}px ${dir} numbering`).not.toBe('none');
      expect(await menu.evaluate(node => getComputedStyle(node).listStyleType), `${width}px ${dir} navigation`).toBe('none');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px ${dir} overflow`).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: projectWidth(info), height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  expect(await footnotes.evaluate(node => getComputedStyle(node).listStyleType)).not.toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'RTL 200% overflow').toBeLessThanOrEqual(1);
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'forcedColors overflow').toBeLessThanOrEqual(1);
  const link = fixture.locator('nav a').first();
  expect(await link.evaluate(node => node.getBoundingClientRect().height), 'navigation target').toBeGreaterThanOrEqual(43);
  await link.focus();
  await expect(link).toBeFocused();
  expect(await link.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await fixture.screenshot({ path: `test-artifacts/screenshots/footer-footnotes-viewport-${projectWidth(info)}-rtl-200-forced-colors.png` });
});
