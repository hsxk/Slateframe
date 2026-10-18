const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

test('registered Core FAQ stays valid and bounded in Gutenberg', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress fixture covers seven responsive widths');
  const blocks = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-faq')['content'];");
  expect(blocks.match(/<!-- wp:details/g)).toHaveLength(3);
  const id = wp('post', 'create', '--post_type=page', '--post_status=draft',
    '--post_title=Slateframe native FAQ editor fixture', '--post_content=' + blocks, '--porcelain');
  try {
    await openAuthenticatedEditor(page, id);
    const framed = await page.locator('iframe[name="editor-canvas"]').count() > 0;
    const canvas = framed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
    const root = canvas.locator('.editor-styles-wrapper').first();
    const faq = root.locator('.slateframe-knowledge-faq').first();
    await expect(faq).toBeVisible();
    const details = faq.locator('details.wp-block-details');
    await expect(details).toHaveCount(3);
    await expect(details.locator('summary')).toHaveCount(3);
    const parsed = await page.evaluate(() => {
      const names = [], invalid = [];
      const walk = blocks => blocks.forEach(block => {
        names.push(block.name);
        if (block.isValid === false) invalid.push(block.name);
        walk(block.innerBlocks || []);
      });
      walk(window.wp.data.select('core/block-editor').getBlocks());
      return { names, invalid };
    });
    expect(parsed.names.filter(name => name === 'core/details')).toHaveLength(3);
    expect(parsed.names).not.toContain('core/missing');
    expect(parsed.invalid).toEqual([]);

    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await root.evaluate((node, dir) => { node.dir = dir; }, direction);
        const metrics = await faq.evaluate(node => {
          const canvas = node.closest('.editor-styles-wrapper');
          const rect = canvas.getBoundingClientRect();
          return {
            direction: getComputedStyle(node).direction,
            left: rect.left, right: rect.right,
            overflow: canvas.scrollWidth - canvas.clientWidth,
            summaries: [...node.querySelectorAll('details > summary')].map(summary => {
              const box = summary.getBoundingClientRect();
              return { left: box.left, right: box.right, height: box.height };
            }),
          };
        });
        expect(metrics.direction, width + ' ' + direction).toBe(direction);
        expect(metrics.overflow, width + ' ' + direction).toBeLessThanOrEqual(1);
        expect(metrics.summaries).toHaveLength(3);
        for (const box of metrics.summaries) {
          expect(box.height).toBeGreaterThanOrEqual(43);
          expect(box.left).toBeGreaterThanOrEqual(metrics.left - 1);
          expect(box.right).toBeLessThanOrEqual(metrics.right + 1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await root.evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await faq.screenshot({ path: 'test-artifacts/screenshots/gutenberg-knowledge-faq-390-rtl-200-forced-colors.png' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await root.evaluate(node => { node.dir = 'ltr'; node.style.fontSize = ''; });
    await faq.screenshot({ path: 'test-artifacts/screenshots/gutenberg-knowledge-faq-1440-ltr.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
