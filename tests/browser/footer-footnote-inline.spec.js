const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const AxeBuilder = require('@axe-core/playwright').default;

const projectWidth = (info) => info.project.use.viewport?.width || 1440;

test('footer Core Footnotes preserve inline source and citation links, but bounded return controls', async ({ page }, info) => {
  test.skip(![390, 1440].includes(projectWidth(info)), 'Representative mobile and desktop browser evidence.');
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.slateframe-site-footer').evaluate((footer) => {
    const section = document.createElement('section');
    section.className = 'slateframe-footer-widget slateframe-footer-footnote-inline-qa';
    section.innerHTML = '<p>Source <sup id="fnref-inline-qa"><a href="#fn-inline-qa">1</a></sup> in a normal sentence.</p><ol class="wp-block-footnotes"><li id="fn-inline-qa">日本語 中文 العربية <a href="https://example.org/reference">External citation</a> and <a href="#fnref-inline-qa" aria-label="Return to source reference">↩</a></li></ol>';
    footer.prepend(section);
  });
  const region = page.locator('.slateframe-footer-footnote-inline-qa');
  const source = region.locator('sup a');
  const citation = region.locator('a[href="https://example.org/reference"]');
  const back = region.locator('a[href="#fnref-inline-qa"]');
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate((direction) => { document.documentElement.dir = direction; }, dir);
      expect(await source.evaluate((node) => getComputedStyle(node).display), `${width}px ${dir} source`).toBe('inline');
      expect(await citation.evaluate((node) => getComputedStyle(node).display), `${width}px ${dir} citation`).toBe('inline');
      const target = await back.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return { display: getComputedStyle(node).display, width: box.width, height: box.height };
      });
      expect(target.display).toBe('inline-grid');
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(await region.locator('ol').evaluate((node) => getComputedStyle(node).listStyleType)).not.toBe('none');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px ${dir} overflow`).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: projectWidth(info), height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await source.focus();
  await page.keyboard.press('Tab');
  await expect(citation).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
  expect(await back.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#fnref-inline-qa$/);
  await expect(region.locator('sup')).toHaveCSS('outline-style', 'solid');
  const accessibility = await new AxeBuilder({ page }).include('.slateframe-footer-footnote-inline-qa')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await region.screenshot({
    path: path.join('test-artifacts/screenshots', `footer-footnote-inline-${projectWidth(info)}-rtl-200-forced-colors.png`),
  });
});
