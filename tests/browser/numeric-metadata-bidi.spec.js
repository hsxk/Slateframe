const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

// Verify actual WordPress output, not a synthetic DOM approximation.
test('published metadata preserves Core dates and isolates mixed-script text', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers the full matrix');
  test.setTimeout(180000);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.goto('/', { waitUntil: 'networkidle' });
  const firstPost = page.locator('.slateframe-card-title a').first();
  await expect(firstPost).toBeVisible();
  const postUrl = await firstPost.getAttribute('href');
  expect(postUrl).toBeTruthy();
  for (const surface of [
    { route: '/', label: 'listing' },
    { route: postUrl, label: 'article' },
  ]) {
    await page.goto(surface.route, { waitUntil: 'networkidle' });
    const date = page.locator('.slateframe-published').first();
    await expect(date).toBeVisible();
    const iso = date.locator(':scope > bdi');
    await expect(iso).toHaveCount(1);
    expect(await date.getAttribute('datetime')).toBeTruthy();
    expect(await iso.evaluate(node => getComputedStyle(node).unicodeBidi)).toBe('isolate');
    await iso.evaluate(node => { node.textContent = '2026年11月1日 العربية'; });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const state = await date.evaluate(node => ({
            left: node.getBoundingClientRect().left,
            right: node.getBoundingClientRect().right,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }));
          const label = surface.label + ' ' + width + ' ' + direction + ' ' + font;
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const axe = await new AxeBuilder({ page }).include('.slateframe-entry-meta')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations, surface.label).toEqual([]);
    await page.screenshot({ path: 'test-artifacts/screenshots/numeric-metadata-' + surface.label + '-390-rtl-400.png' });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.screenshot({ path: 'test-artifacts/screenshots/numeric-metadata-' + surface.label + '-390-rtl-400-forced-colors.png' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await page.screenshot({ path: 'test-artifacts/screenshots/numeric-metadata-' + surface.label + '-1440-ltr.png' });
  }
});
