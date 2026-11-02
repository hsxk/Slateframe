const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core checklist and scoped group resets survive CSS compaction in real WordPress', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable fixture checks seven widths');
  test.setTimeout(150000);
  const classes = ['key-facts', 'learning-callout', 'project-brief', 'definition'];
  const groups = classes.map(name =>
    '<!-- wp:group {"className":"is-style-slateframe-' + name + '"} -->' +
    '<div class="wp-block-group is-style-slateframe-' + name + '">' +
    '<!-- wp:paragraph --><p>First 日本語 العربية</p><!-- /wp:paragraph -->' +
    '<!-- wp:paragraph --><p>Last 中文 text</p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:group -->'
  ).join('');
  const list = (extra) =>
    '<!-- wp:list {"className":"is-style-slateframe-checklist"} -->' +
    '<ul class="' + extra + ' is-style-slateframe-checklist">' +
    '<li>First 日本語</li><li>Second العربية</li></ul><!-- /wp:list -->';
  const content = '<!-- wp:group {"className":"slateframe-css-selector-fixture"} -->' +
    '<div class="wp-block-group slateframe-css-selector-fixture">' +
    list('wp-block-list') + list('') + groups + '</div><!-- /wp:group -->';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=CSS selector scope fixture', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-css-selector-fixture');
    await expect(root).toBeVisible();
    await expect(root.locator('.is-style-slateframe-checklist')).toHaveCount(2);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 64] : [16]) {
          await setRootTextScale(page, font, direction);
          const result = await root.evaluate((node) => ({
            checklist: [...node.querySelectorAll('.is-style-slateframe-checklist > li')]
              .map(item => ({
                marker: getComputedStyle(item, '::before').content,
                position: getComputedStyle(item).position,
              })),
            groups: [...node.querySelectorAll('.wp-block-group[class*="is-style-slateframe-"]')]
              .map(group => ({
                first: getComputedStyle(group.firstElementChild).marginBlockStart,
                last: getComputedStyle(group.lastElementChild).marginBlockEnd,
              })),
          }));
          const label = width + 'px ' + direction + ' ' + font + 'px';
          expect(result.checklist, label + ' checklist items').toHaveLength(4);
          for (const item of result.checklist) {
            expect(item.marker, label + ' Core marker').toContain('✓');
            expect(item.position, label + ' item positioning').toBe('relative');
          }
          expect(result.groups, label + ' supported groups').toHaveLength(4);
          for (const group of result.groups) {
            expect(group.first, label + ' first-child margin').toBe('0px');
            expect(group.last, label + ' last-child margin').toBe('0px');
          }
        }
      }
    }
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
