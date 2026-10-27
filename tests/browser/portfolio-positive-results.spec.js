const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const patternSlug = 'slateframe/portfolio-project-grid';
const viewport = (info) => info.project.use.viewport?.width || 0;
const portfolioWithSearch = (needle) => {
  const registered = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('" + patternSlug + "')['content'];");
  const original = '"search":""';
  if (registered.split(original).length !== 2) throw new Error('Registered Portfolio Query Loop search contract changed');
  return registered.replace(original, '"search":"' + needle + '"');
};
test('native Portfolio Query Loop renders matching posts and hides its empty state', async ({ page }, info) => {
  const marker = 'slateframe-portfolio-proof-' + randomUUID().replaceAll('-', '').slice(0, 12);
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=' + marker, '--post_content=Slateframe Core Query Loop fixture', '--porcelain');
  let pageId;
  try {
    const blocks = portfolioWithSearch(marker);
    expect(blocks).toContain('<!-- wp:query-no-results -->');
    expect(blocks).toContain('"postType":"post"');
    expect(blocks).toContain('"search":"' + marker + '"');
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Slateframe Portfolio positive fixture', '--post_content=' + blocks, '--porcelain');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const grid = page.locator('.slateframe-project-grid').first();
    const cards = grid.locator('.wp-block-post-template > .wp-block-post');
    await expect(grid).toBeVisible();
    await expect(cards).toHaveCount(1);
    await expect(grid.locator('.wp-block-query-no-results')).toHaveCount(0);
    await expect(grid.locator('.wp-block-query-pagination a')).toHaveCount(0);
    const title = cards.first().locator('.wp-block-post-title a').first();
    await expect(title).toHaveText(marker);
    await title.focus();
    await expect(title).toBeFocused();
    for (const direction of ['ltr', 'rtl']) {
      await page.locator('html').evaluate((node, dir) => {
        node.dir = dir;
        node.style.setProperty('font-size', '32px', 'important');
      }, direction);
      await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(32);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      const geometry = await title.evaluate((node) => {
        const root = document.documentElement;
        const card = node.closest('.wp-block-post');
        const box = card.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(node);
        const text = range.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          viewport: root.clientWidth, document: root.scrollWidth,
          rootPx: Number.parseFloat(getComputedStyle(root).fontSize),
          cardLeft: box.left, cardRight: box.right,
          textLeft: text.left, textRight: text.right,
          visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0,
        };
      });
      expect(geometry.rootPx, direction + ' positive Query Loop actual 200%').toBeCloseTo(32, 1);
      expect(geometry.visible, direction).toBe(true);
      expect(geometry.document - geometry.viewport, direction).toBeLessThanOrEqual(1);
      expect(geometry.cardLeft, direction).toBeGreaterThanOrEqual(-1);
      expect(geometry.cardRight, direction).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.textLeft, direction).toBeGreaterThanOrEqual(-1);
      expect(geometry.textRight, direction).toBeLessThanOrEqual(geometry.viewport + 1);
      if ([390, 1440].includes(viewport(info))) {
        await title.evaluate((node) => node.blur());
        await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
        await expect.poll(() => page.evaluate(() => Math.abs(window.scrollY))).toBeLessThanOrEqual(1);
        const dir = path.resolve('test-artifacts/screenshots');
        await fs.mkdir(dir, { recursive: true });
        await page.screenshot({
          path: path.join(dir, 'viewport-' + viewport(info) + '-portfolio-positive-' + direction + '-200-forced-colors.png'),
          fullPage: true,
        });
      }
    }
  } finally {
    if (pageId) wp('post', 'delete', pageId, '--force');
    wp('post', 'delete', postId, '--force');
  }
});
