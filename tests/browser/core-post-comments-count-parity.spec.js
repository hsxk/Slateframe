const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('native Comments Count tracks approved comments and reflows without links', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-comments-count-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:query {"queryId":92,"className":"slateframe-comments-count-fixture","query":{"perPage":1,"postType":"post","order":"desc","orderBy":"date","search":"' + slug + '","inherit":false}} -->' +
    '<div class="wp-block-query slateframe-comments-count-fixture">' +
    '<!-- wp:post-template -->' +
    '<!-- wp:post-comments-count {"className":"slateframe-comments-count-native"} /-->' +
    '<!-- /wp:post-template --></div><!-- /wp:query -->';
  let postId, pageId, approvedId, pendingId, secondApprovedId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--comment_status=open', '--post_title=' + slug, '--post_name=' + slug,
      '--post_content=Native comments count fixture', '--porcelain');
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Native Comments Count Query Loop fixture',
      '--post_content=' + content, '--porcelain');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-comments-count-fixture');
    const count = root.locator('.wp-block-post-comments-count');
    await expect(count).toHaveCount(1);
    await expect(count).toHaveText('0');
    await expect(count.locator('a,button')).toHaveCount(0);
    pendingId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Slateframe Pending', '--comment_author_email=pending@example.org',
      '--comment_content=Pending moderation fixture', '--comment_approved=0', '--porcelain');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(count).toHaveText('0');
    approvedId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Slateframe Approved', '--comment_author_email=approved@example.org',
      '--comment_content=Approved comment fixture', '--comment_approved=1', '--porcelain');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(count).toHaveText('1');
    secondApprovedId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Slateframe Second', '--comment_author_email=second@example.org',
      '--comment_content=Second approved comment', '--comment_approved=1', '--porcelain');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(count).toHaveText('2');
    expect(Number(wp('comment', 'list', '--post_id=' + postId,
      '--status=approve', '--format=count'))).toBe(2);
    wp('post', 'update', postId, '--comment_status=closed');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(count).toHaveText('2');
    wp('post', 'update', postId, '--comment_status=open');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-comments-count-inline-css') ||
      document.getElementById('slateframe-core-post-comments-count-css')
    ))).toBe(true);
    await count.evaluate(node => {
      node.textContent = '日本語 中文 العربية ' + 'VeryLongUnbrokenCommentCount'.repeat(8);
    });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const m = await count.evaluate(node => {
            const r = node.getBoundingClientRect(), s = getComputedStyle(node);
            return { left: r.left, right: r.right, height: r.height, wrap: s.overflowWrap,
              numeric: s.fontVariantNumeric,
              overflow: document.documentElement.scrollWidth -
                document.documentElement.clientWidth };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(m.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(m.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(m.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(m.height, label + ' text visible').toBeGreaterThan(0);
          expect(m.wrap, label + ' wrapping').toBe('anywhere');
          expect(m.numeric, label + ' tabular numbers').toContain('tabular-nums');
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-post-comments-count-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await expect(count).not.toHaveAttribute('tabindex', '0');
    const axe = await new AxeBuilder({ page }).include('.slateframe-comments-count-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-post-comments-count-390-rtl-200-forced-colors.png',
    });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-comments-count-inline-css') ||
      document.getElementById('slateframe-core-post-comments-count-css')
    ))).toBe(false);
  } finally {
    if (pageId) wp('post', 'delete', pageId, '--force');
    if (secondApprovedId) wp('comment', 'delete', secondApprovedId, '--force');
    if (approvedId) wp('comment', 'delete', approvedId, '--force');
    if (pendingId) wp('comment', 'delete', pendingId, '--force');
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Comments Count Gutenberg roundtrip retains Core attributes', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-comments-count')?.attributes;
    if (!schema) throw new Error('Native Core Post Comments Count schema missing');
    const first = blocks.serialize(blocks.createBlock('core/post-comments-count', {
      className: 'slateframe-comments-count-editor',
    }));
    const parsed = blocks.parse(first), second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid,
      className: parsed[0]?.attributes.className };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/post-comments-count');
  expect(result.valid).toBe(true);
  expect(result.className).toBe('slateframe-comments-count-editor');
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
});
