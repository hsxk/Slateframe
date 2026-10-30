const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');
const projectPath = process.env.SLATEFRAME_PROJECT_PATH;

test('image-free Portfolio cards preserve RTL/CJK width at 400% in seven viewports', async ({ page }, info) => {
  test.skip(!projectPath || info.project.use.viewport?.width !== 390, 'Real WordPress Portfolio fixture at 390px');
  test.setTimeout(180000);
  await page.goto(projectPath, { waitUntil: 'networkidle' });
  const card = page.locator('.slateframe-main .slateframe-project-grid .slateframe-project-card').first();
  await expect(card).toBeVisible();
  // Exercise a Core post without a featured image; retain the actual Query markup.
  await card.locator('.wp-block-post-featured-image').evaluateAll(blocks => blocks.forEach(block => block.remove()));
  const title = card.locator('.wp-block-post-title a').first();
  await title.evaluate(link => { link.textContent = '日本語 中文 العربية ' + 'UnbrokenProjectIdentifier'.repeat(3); });
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) for (const font of [16, 32, 64]) {
      await setRootTextScale(page, font, dir);
      const state = await card.evaluate(node => {
        const style = getComputedStyle(node), box = node.getBoundingClientRect();
        return {
          root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          start: parseFloat(style.paddingInlineStart), end: parseFloat(style.paddingInlineEnd),
          top: parseFloat(style.paddingBlockStart),
          border: style.borderInlineStartStyle, left: box.left, right: box.right,
          linkWidth: node.querySelector('.wp-block-post-title a').getBoundingClientRect().width,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          missingImage: !node.querySelector('.wp-block-post-featured-image img'),
        };
      });
      const label = width + 'px ' + dir + ' ' + font + 'px';
      expect(state.root, label).toBeCloseTo(font, 1);
      expect(state.missingImage, label).toBe(true);
      expect(state.start, label + ' bounded logical padding').toBeCloseTo(Math.min(font, 20), 1);
      expect(state.end, label + ' trailing padding').toBeCloseTo(0, 1);
      expect(state.top, label + ' bounded media fallback spacing').toBeCloseTo(Math.min(font * 1.75, 40), 1);
      expect(state.border, label + ' accent border').not.toBe('none');
      expect(state.linkWidth, label + ' title').toBeGreaterThan(0);
      expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
      expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
      expect(state.overflow, label + ' overflow').toBeLessThanOrEqual(1);
    }
  }
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await setRootTextScale(page, 64, 'rtl');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const axe = await new AxeBuilder({ page }).include('.slateframe-project-grid')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  await title.focus();
  await expect(title).toBeFocused();
  const focus = await title.evaluate(node => ({
    style: getComputedStyle(node).outlineStyle,
    width: parseFloat(getComputedStyle(node).outlineWidth),
    height: node.getBoundingClientRect().height,
  }));
  expect(focus.style).not.toBe('none');
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.height).toBeGreaterThanOrEqual(44);
  await card.screenshot({ path: 'test-artifacts/screenshots/portfolio-no-image-390-rtl-400-forced-colors.png', animations: 'disabled' });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await setRootTextScale(page, 16, 'ltr');
  await title.evaluate(node => node.blur());
  await card.screenshot({ path: 'test-artifacts/screenshots/portfolio-no-image-1440-ltr.png', animations: 'disabled' });
});
