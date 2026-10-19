const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const patternSlug = 'slateframe/knowledge-faq';
const content = () => wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('" + patternSlug + "')['content'];");

test('registered Core FAQ stays keyboard-operable, readable and bounded', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One isolated fixture exercises the seven-width matrix');
  const blocks = content();
  expect(blocks).toContain('<!-- wp:details');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe native knowledge FAQ fixture', '--post_content=' + blocks, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const faq = page.locator('.slateframe-prose .slateframe-knowledge-faq').first();
    const details = faq.locator('details.wp-block-details');
    await expect(faq).toBeVisible();
    await expect(details).toHaveCount(3);
    await expect(details.locator('summary')).toHaveCount(3);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, dir) => { node.dir = dir; }, direction);
        for (const control of [44, 48, 56]) {
          await page.locator('html').evaluate((node, size) => {
            node.style.setProperty('--slateframe-control', size + 'px');
          }, control);
          const dimensions = await faq.evaluate((node) => {
            const summaries = [...node.querySelectorAll('details > summary')];
            return {
              width: document.documentElement.clientWidth,
              scrollWidth: document.documentElement.scrollWidth,
              heights: summaries.map(item => item.getBoundingClientRect().height),
              bounds: summaries.map(item => {
                const box = item.getBoundingClientRect();
                return { left: box.left, right: box.right };
              }),
            };
          });
          expect(dimensions.scrollWidth - dimensions.width, width + ' ' + direction).toBeLessThanOrEqual(1);
          for (const height of dimensions.heights) expect(height).toBeGreaterThanOrEqual(control - 1);
          for (const box of dimensions.bounds) {
            expect(box.left).toBeGreaterThanOrEqual(-1);
            expect(box.right).toBeLessThanOrEqual(dimensions.width + 1);
          }
        }
      }
    }
    const summary = details.first().locator('summary');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await expect(details.first()).not.toHaveAttribute('open');
    await summary.focus();
    await expect(summary).toBeFocused();
    await summary.press('Enter');
    await expect(details.first()).toHaveAttribute('open');
    await expect(details.first().locator('p')).toBeVisible();
    await summary.press('Space');
    await expect(details.first()).not.toHaveAttribute('open');
    expect(await summary.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.screenshot({ path: 'test-artifacts/screenshots/knowledge-faq-390-rtl-200-forced-colors.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(node => {
      node.dir = 'ltr';
      node.style.fontSize = '';
      node.style.removeProperty('--slateframe-control');
    });
    await page.emulateMedia({ forcedColors: 'none' });
    // Keyboard focus scrolls the document; normalize the viewport before full-page visual evidence.
    await summary.evaluate(node => node.blur());
    await expect(summary).not.toBeFocused();
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => Math.abs(window.scrollY))).toBeLessThanOrEqual(1);
    await page.screenshot({ path: 'test-artifacts/screenshots/knowledge-faq-1440-ltr.png', fullPage: true });
    await page.emulateMedia({ media: 'print' });
    await expect(details).toHaveCount(3);
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
