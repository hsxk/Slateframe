const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const noMatches = 'slateframe-no-projects-found-' + '4c19b253a6';
// Exercise the registered production pattern rather than a hand-written lookalike.
const content = () => {
  const blocks = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/portfolio-project-grid')['content'];");
  const emptySearch = '"search":""';
  if (!blocks.includes(emptySearch)) throw new Error('Registered Portfolio Query Loop search contract changed');
  return blocks.replace(emptySearch, '"search":"' + noMatches + '"');
};

const viewport = (info) => info.project.use.viewport?.width || 0;

test('empty native Query Loop is readable without phantom cards, pagination or overflow', async ({ page }, info) => {
  const blocks = content();
  expect(blocks).toContain('<!-- wp:query-no-results -->');
  // The registered PHP pattern is localized by WordPress. Read the exact
  // Core Query No Results paragraph, not the English source string or an
  // unrelated paragraph in the same project-grid pattern.
  const expectedEmptyText = await page.evaluate(markup => {
    const noResults = markup.match(/<!-- wp:query-no-results -->([\s\S]*?)<!-- \/wp:query-no-results -->/);
    if (!noResults) return '';
    const parsed = new DOMParser().parseFromString(noResults[1], 'text/html');
    const paragraphs = parsed.querySelectorAll('p');
    return paragraphs.length === 1 ? paragraphs[0].textContent.trim() : '';
  }, blocks);
  expect(expectedEmptyText).not.toBe('');
  expect(blocks).toContain('"search":"' + noMatches + '"');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe empty Portfolio fixture', '--post_content=' + blocks, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'domcontentloaded' });
    const grid = page.locator('.slateframe-project-grid').first();
    const empty = grid.locator('.wp-block-query-no-results').first();
    await expect(empty).toBeVisible();
    await expect(empty).toContainText(expectedEmptyText);
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
        const style = getComputedStyle(node);
        const textRects = [...node.querySelectorAll('p')].flatMap(paragraph => {
          const range = document.createRange();
          range.selectNodeContents(paragraph);
          return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
        });
        return {
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          left: box.left,
          right: box.right,
          visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0,
          textRects: textRects.length,
          clippedText: textRects.some(rect => rect.left < box.left - 2 || rect.right > box.right + 2),
        };
      });
      expect(result.visible).toBe(true);
      expect(result.textRects).toBeGreaterThan(0);
      expect(result.clippedText, direction + ' localized empty-state text').toBe(false);
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
