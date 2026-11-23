const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000
}).trim();

test('Core Columns preserve multilingual reading and keyboard access at narrow widths and text zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers all viewports');
  test.setTimeout(150000);
  const slug = 'slateframe-columns-' + randomUUID().slice(0, 12);
  const text = 'LongUnbrokenIdentifier'.repeat(10) + '日本語中文العربية';
  const content = '<!-- wp:columns --><div class="wp-block-columns">' +
    '<!-- wp:column --><div class="wp-block-column"><!-- wp:paragraph --><p>' + text +
    '</p><!-- /wp:paragraph --></div><!-- /wp:column -->' +
    '<!-- wp:column --><div class="wp-block-column"><!-- wp:paragraph --><p>' +
    '<a href="#columns-end">Keyboard accessible link</a></p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:column --></div><!-- /wp:columns -->' +
    '<!-- wp:paragraph --><p id="columns-end">End of columns</p><!-- /wp:paragraph -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const columns = page.locator('.wp-block-columns').first();
    await expect(columns.locator('.wp-block-column')).toHaveCount(2);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const state = await columns.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            columns: [...node.children].map(child => ({
              left: child.getBoundingClientRect().left,
              right: child.getBoundingClientRect().right,
              minInline: getComputedStyle(child).minInlineSize,
              maxInline: getComputedStyle(child).maxInlineSize,
              wrap: getComputedStyle(child).overflowWrap
            }))
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          for (const child of state.columns) {
            expect(child.left, label + ' column left').toBeGreaterThanOrEqual(-1);
            expect(child.right, label + ' column right').toBeLessThanOrEqual(width + 1);
            expect(child.minInline).toBe('0px');
            expect(child.maxInline).toBe('100%');
            expect(child.wrap).toBe('anywhere');
          }
          if (width === 390 && font === 64) {
            await page.screenshot({
              path: 'test-artifacts/screenshots/core-columns-390-' + dir + '-64.png',
              fullPage: true
            });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const link = columns.locator('a');
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#columns-end$/);
    await expect(page.locator('#columns-end')).toBeInViewport();
    await setRootTextScale(page, 64, 'ltr');
    await page.evaluate(() => { history.replaceState(null, '', location.pathname + location.search); scrollTo(0, 0); });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#columns-end$/);
    await expect(page.locator('#columns-end')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});
