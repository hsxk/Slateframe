const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Comments Link preserves Core count, URL and accessible reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-comments-link-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:query {"queryId":91,"className":"slateframe-comments-link-fixture","query":{"perPage":1,"postType":"post","order":"desc","orderBy":"date","search":"' + slug + '","inherit":false}} -->' +
    '<div class="wp-block-query slateframe-comments-link-fixture">' +
    '<!-- wp:post-template -->' +
    '<!-- wp:post-comments-link {"className":"slateframe-comments-link-native"} /-->' +
    '<!-- /wp:post-template -->' +
    '</div><!-- /wp:query -->';
  let postId, pageId, commentId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--comment_status=open', '--post_title=' + slug, '--post_name=' + slug,
      '--post_content=Native comment fixture', '--porcelain');
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Native Comments Link Query Loop fixture', '--post_content=' + content, '--porcelain');
    commentId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Slateframe Test', '--comment_author_email=example@example.org',
      '--comment_content=Native comment fixture', '--comment_approved=1', '--porcelain');
    expect(Number(wp('comment', 'list', '--post_id=' + postId, '--status=approve', '--format=count'))).toBe(1);
    const coreUrl = wp('eval', 'echo get_comments_link(' + Number(postId) + ');');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-comments-link-fixture');
    const block = root.locator('.wp-block-post-comments-link');
    const link = block.locator('a');
    await expect(block).toHaveCount(1);
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', coreUrl);
    expect((await link.innerText()).trim().length).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-comments-link-inline-css') ||
      document.getElementById('slateframe-core-post-comments-link-css')
    ))).toBe(true);
    // Stress an unusually long localized Core label without changing stored content.
    await link.evaluate(node => {
      node.textContent = '日本語 中文 العربية ' + 'VeryLongUnbrokenCommentsLabel'.repeat(8);
    });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const m = await link.evaluate(node => {
            const r = node.getBoundingClientRect(), s = getComputedStyle(node);
            return { left: r.left, right: r.right, width: r.width, height: r.height,
              wrap: s.overflowWrap, overflow: document.documentElement.scrollWidth -
                document.documentElement.clientWidth };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(m.overflow, label + ' page overflow').toBeLessThanOrEqual(1);
          expect(m.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(m.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(m.width, label + ' touch width').toBeGreaterThanOrEqual(43);
          expect(m.height, label + ' touch height').toBeGreaterThanOrEqual(43);
          expect(m.wrap, label + ' long translated label').toBe('anywhere');
          if (font === 16) await page.screenshot({ fullPage: true,
            path: 'test-artifacts/screenshots/core-post-comments-link-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-comments-link-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-post-comments-link-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-comments-link-inline-css') ||
      document.getElementById('slateframe-core-post-comments-link-css')
    ))).toBe(false);
  } finally {
    if (pageId) wp('post', 'delete', pageId, '--force');
    if (commentId) wp('comment', 'delete', commentId, '--force');
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Comments Link Gutenberg roundtrip preserves Core attributes', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-comments-link')?.attributes;
    if (!schema) throw new Error('Native Core Post Comments Link block is missing');
    const first = blocks.serialize(blocks.createBlock('core/post-comments-link', {
      className: 'slateframe-comments-link-editor'
    }));
    const parsed = blocks.parse(first), second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid,
      className: parsed[0]?.attributes.className };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/post-comments-link');
  expect(result.valid).toBe(true);
  expect(result.className).toBe('slateframe-comments-link-editor');
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
});
