const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('registered Knowledge FAQ retains native 400% LTR/RTL disclosure geometry', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const content = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-faq')['content'];");
  expect(content).toContain('<!-- wp:details');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Knowledge FAQ 400% acceptance', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const faq = page.locator('.slateframe-prose .slateframe-knowledge-faq').first();
    await expect(faq).toBeVisible();
    const summaries = faq.locator('details.wp-block-details > summary');
    await expect(summaries).toHaveCount(3);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, direction);
          const state = await faq.evaluate(node => {
            const root = document.documentElement;
            const bounds = [...node.querySelectorAll('details > summary')].map(item => {
              const rect = item.getBoundingClientRect();
              return { left: rect.left, right: rect.right, height: rect.height };
            });
            return {
              rootFont: parseFloat(getComputedStyle(root).fontSize),
              control: parseFloat(getComputedStyle(root).getPropertyValue('--slateframe-control')),
              overflow: root.scrollWidth - root.clientWidth,
              bounds,
            };
          });
          const label = width + 'px ' + direction + ' ' + font + 'px';
          expect(state.rootFont, label + ' computed root font').toBeCloseTo(font, 1);
          expect(state.control, label + ' bounded control').toBeGreaterThanOrEqual(44);
          expect(state.control, label + ' bounded control').toBeLessThanOrEqual(56);
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.bounds, label + ' native summaries').toHaveLength(3);
          for (const rect of state.bounds) {
            expect(rect.left, label + ' summary left').toBeGreaterThanOrEqual(-1);
            expect(rect.right, label + ' summary right').toBeLessThanOrEqual(width + 1);
            expect(rect.height, label + ' 44px target').toBeGreaterThanOrEqual(43);
          }
          if (width === 390 && font === 64) {
            const summary = summaries.first();
            await summary.focus();
            await summary.scrollIntoViewIfNeeded();
            await expect(summary).toBeInViewport();
            await page.screenshot({
              path: 'test-artifacts/screenshots/knowledge-faq-390-' + direction + '-400.png',
              animations: 'disabled',
            });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const summary = summaries.first();
    await summary.focus();
    await expect(summary).toBeFocused();
    await summary.scrollIntoViewIfNeeded();
    await expect(summary).toBeInViewport();
    expect(await summary.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
    await summary.press('Enter');
    await expect(faq.locator('details').first()).toHaveAttribute('open');
    await summary.press('Space');
    await expect(faq.locator('details').first()).not.toHaveAttribute('open');
    await summary.focus();
    await summary.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-artifacts/screenshots/knowledge-faq-390-rtl-400-forced-colors.png',
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
