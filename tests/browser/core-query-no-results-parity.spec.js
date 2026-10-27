const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const { setRootTextScale } = require('./support/root-text-scale');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('native Query No Results appears only for an empty Core Query Loop', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-no-results-' + randomUUID().slice(0, 12);
  const fallback = '日本語 中文 العربية ' + 'LongUnbrokenFallback'.repeat(9);
  const query = (id, search, cls) => '<!-- wp:query ' +
    JSON.stringify({ queryId: id, className: cls, query: {
      perPage: 1, postType: 'post', order: 'desc', orderBy: 'date',
      search, inherit: false,
    } }) + ' --><div class="wp-block-query ' + cls + '">' +
    '<!-- wp:post-template --><!-- wp:post-title {"isLink":true} /--><!-- /wp:post-template -->' +
    '<!-- wp:query-no-results --><!-- wp:paragraph --><p>' + fallback + '</p>' +
    '<!-- /wp:paragraph --><!-- wp:buttons --><div class="wp-block-buttons">' +
    '<!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="/">Browse all posts</a></div><!-- /wp:button -->' +
    '</div><!-- /wp:buttons --><!-- /wp:query-no-results -->' +
    '</div><!-- /wp:query -->';
  let postId, pageId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--porcelain');
    const content = '<!-- wp:group {"className":"slateframe-query-no-results-fixture"} -->' +
      '<div class="wp-block-group slateframe-query-no-results-fixture">' +
      query(111, slug + '-not-found', 'slateframe-empty-query') +
      query(112, slug, 'slateframe-populated-query') +
      '</div><!-- /wp:group -->';
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Native Query No Results fixture',
      '--post_content=' + content, '--porcelain');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-query-no-results-fixture');
    const empty = root.locator('.slateframe-empty-query');
    const populated = root.locator('.slateframe-populated-query');
    const message = empty.locator('.wp-block-query-no-results');
    await expect(message).toHaveCount(1);
    await expect(message.locator('p')).toHaveText(fallback);
    await expect(empty.locator('.wp-block-post')).toHaveCount(0);
    await expect(populated.locator('.wp-block-query-no-results')).toHaveCount(0);
    await expect(populated.locator('.wp-block-post')).toHaveCount(1);
    await expect(populated.locator('.wp-block-post-title')).toContainText(slug);
    const button = message.locator('.wp-block-button__link');
    await expect(button).toHaveAttribute('href', '/');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-query-no-results-inline-css') ||
      document.getElementById('slateframe-core-query-no-results-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await setRootTextScale(page, font, dir);
          const m = await message.evaluate(node => {
            const box = node.getBoundingClientRect();
            const a = node.querySelector('.wp-block-button__link').getBoundingClientRect();
            return { left: box.left, right: box.right, height: box.height,
              wrap: getComputedStyle(node).overflowWrap,
              button: { left: a.left, right: a.right, width: a.width, height: a.height },
              overflow: document.documentElement.scrollWidth -
                document.documentElement.clientWidth };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(m.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(m.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(m.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(m.height, label + ' visible fallback').toBeGreaterThan(0);
          expect(m.wrap).toBe('anywhere');
          expect(m.button.left).toBeGreaterThanOrEqual(-1);
          expect(m.button.right).toBeLessThanOrEqual(width + 1);
          expect(m.button.width).toBeGreaterThanOrEqual(43);
          expect(m.button.height).toBeGreaterThanOrEqual(43);
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await message.screenshot({
              path: 'test-artifacts/screenshots/core-query-no-results-' + width + '-' + dir + '.png',
            });
          }
          if (font === 64 && width === 390) {
            await message.screenshot({
              path: 'test-artifacts/screenshots/core-query-no-results-390-' + dir + '-400.png',
            });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await page.keyboard.press('Tab');
    await button.focus();
    await expect(button).toBeFocused();
    await expect.poll(() => button.evaluate(el =>
      parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-query-no-results-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await button.focus();
    await message.screenshot({
      path: 'test-artifacts/screenshots/core-query-no-results-390-rtl-200-forced-colors.png',
    });
    await setRootTextScale(page, 64, 'rtl');
    await button.focus();
    await expect(button).toBeFocused();
    expect(await button.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await message.screenshot({
      path: 'test-artifacts/screenshots/core-query-no-results-390-rtl-400-forced-colors.png',
    });
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-query-no-results-inline-css') ||
      document.getElementById('slateframe-core-query-no-results-css')
    ))).toBe(false);
  } finally {
    if (pageId) wp('post', 'delete', pageId, '--force');
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Query No Results Gutenberg roundtrip preserves nested Core content', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    if (!blocks.getBlockType('core/query-no-results')) throw new Error('Core No Results block missing');
    const nested = blocks.createBlock('core/query-no-results', {}, [
      blocks.createBlock('core/paragraph', { content: '日本語 中文 العربية fallback' }),
    ]);
    const first = blocks.serialize(nested);
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, child: parsed[0]?.innerBlocks[0]?.name,
      valid: parsed[0]?.isValid };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/query-no-results');
  expect(result.child).toBe('core/paragraph');
  expect(result.valid).toBe(true);
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
});
