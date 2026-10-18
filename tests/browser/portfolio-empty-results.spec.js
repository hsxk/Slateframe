const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const noMatches = 'slateframe-no-projects-found-' + '4c19b253a6';
const content = '<!-- wp:group {"align":"wide","className":"slateframe-project-grid","layout":{"type":"constrained"}} -->' +
  '<div class="wp-block-group alignwide slateframe-project-grid">' +
  '<!-- wp:query {"queryId":0,"query":{"perPage":6,"postType":"post","search":"' + noMatches + '","inherit":false},"displayLayout":{"type":"flex","columns":3}} -->' +
  '<div class="wp-block-query"><!-- wp:post-template -->' +
  '<!-- wp:post-title {"isLink":true} /--><!-- /wp:post-template -->' +
  '<!-- wp:query-no-results --><!-- wp:paragraph -->' +
  '<p>No projects are available yet. 中文 日本語 العربية</p>' +
  '<!-- /wp:paragraph --><!-- /wp:query-no-results -->' +
  '</div><!-- /wp:query --></div><!-- /wp:group -->';

const viewport = (info) => info.project.use.viewport?.width || 0;

test('empty native Query Loop is readable without phantom cards, pagination or overflow', async ({ page }, info) => {
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe empty Portfolio fixture', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'domcontentloaded' });
    const grid = page.locator('.slateframe-project-grid').first();
    const empty = grid.locator('.wp-block-query-no-results').first();
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('No projects are available yet.');
    await expect(grid.locator('.wp-block-post-template > .wp-block-post')).toHaveCount(0);
    await expect(grid.locator('.wp-block-query-pagination a')).toHaveCount(0);

    for (const direction of ['ltr', 'rtl']) {
      await page.locator('html').evaluate((node, dir) => {
        node.dir = dir;
        node.style.fontSize = '200%';
      }, direction);
      await page.emulateMedia({ forcedColors: 'active' });
      const result = await empty.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return {
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          left: box.left,
          right: box.right,
          visible: getComputedStyle(node).display !== 'none',
        };
      });
      expect(result.visible).toBe(true);
      expect(result.scrollWidth - result.width).toBeLessThanOrEqual(1);
      expect(result.left).toBeGreaterThanOrEqual(-1);
      expect(result.right).toBeLessThanOrEqual(result.width + 1);
      if ([390, 1440].includes(viewport(info))) {
        const dir = path.resolve('test-artifacts/screenshots');
        await fs.mkdir(dir, { recursive: true });
        await page.screenshot({
          path: path.join(dir, 'portfolio-empty-native-' + direction + '-200-forced-colors-viewport-' + viewport(info) + '.png'),
          fullPage: true,
        });
      }
    }
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
