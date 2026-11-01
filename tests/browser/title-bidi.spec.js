const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';

// Core Post Title blocks are intentionally excluded: they belong to WordPress.
test('theme-owned titles isolate multilingual names without changing links or reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture exercises the matrix');
  test.setTimeout(180000);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  const surfaces = [
    { route: postPath, title: '.slateframe-entry-title', link: false, kind: 'single' },
    { route: '/', title: '.slateframe-card-title a', link: true },
    { route: '/slateframe-browser-missing-route/', title: '.slateframe-not-found-recent .slateframe-related-title', link: false },
  ];
  for (const surface of surfaces) {
    await page.goto(surface.route, { waitUntil: 'networkidle' });
    const title = page.locator(surface.title).first();
    await expect(title).toBeVisible();
    const isolated = title.locator('bdi');
    await expect(isolated).toHaveCount(1);
    expect(await isolated.evaluate(node => getComputedStyle(node).unicodeBidi)).toBe('isolate');
    const originalHref = surface.link ? await title.getAttribute('href') : null;
    await isolated.evaluate(node => {
      node.textContent = '日本語 中文 العربية — ' + 'LongUnbrokenTitleIdentifier'.repeat(5);
    });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const state = await title.evaluate(node => {
            const rect = node.getBoundingClientRect();
            return { left: rect.left, right: rect.right,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          const label = surface.title + ' ' + width + ' ' + direction + ' ' + font;
          expect(state.overflow, label + ' horizontal overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left edge').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right edge').toBeLessThanOrEqual(width + 1);
        }
      }
    }
    if (surface.link) {
      await expect(title).toHaveAttribute('href', originalHref);
      await title.focus();
      await expect(title).toBeFocused();
    }
    const axe = await new AxeBuilder({ page }).include(surface.title)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations, surface.title).toEqual([]);
    if (surface.kind === 'single') {
      await page.setViewportSize({ width: 390, height: 900 });
      await setRootTextScale(page, 64, 'rtl');
      await title.scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'test-artifacts/screenshots/theme-title-bidi-390-rtl-400.png' });
      await page.setViewportSize({ width: 1440, height: 900 });
      await setRootTextScale(page, 16, 'ltr');
      await page.screenshot({ path: 'test-artifacts/screenshots/theme-title-bidi-1440-ltr.png' });
    }
  }
});
