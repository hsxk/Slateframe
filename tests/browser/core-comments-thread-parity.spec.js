const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();
const content = '<!-- wp:comments {"className":"slateframe-core-thread-fixture"} -->' +
  '<div class="wp-block-comments slateframe-core-thread-fixture">' +
  '<!-- wp:comment-template --><!-- wp:group --><div class="wp-block-group">' +
  '<!-- wp:comment-author-name {"isLink":true} /--><!-- wp:comment-date {"isLink":true} /-->' +
  '<!-- wp:comment-content /--><!-- wp:comment-reply-link /-->' +
  '</div><!-- /wp:group --><!-- /wp:comment-template --></div><!-- /wp:comments -->';

test('native Core Comments thread retains approval, 44px targets and RTL/CJK 400% reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers all widths');
  test.setTimeout(180000);
  let postId, approvedId, replyId, pendingId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--comment_status=open', '--post_title=Core Comments thread fixture',
      '--post_content=' + content, '--porcelain');
    approvedId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=日本語 中文 العربية Core Commenter',
      '--comment_author_email=approved@example.org', '--comment_author_url=https://example.org/',
      '--comment_content=' + 'UnbrokenCommentContent'.repeat(12),
      '--comment_approved=1', '--porcelain');
    replyId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_parent=' + approvedId, '--comment_author=Nested Commenter',
      '--comment_author_email=nested@example.org', '--comment_content=Approved nested response',
      '--comment_approved=1', '--porcelain');
    pendingId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Pending comment', '--comment_author_email=pending@example.org',
      '--comment_content=Private pending content', '--comment_approved=0', '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-core-thread-fixture');
    await expect(root).toHaveCount(1);
    await expect(page.locator('.slateframe-comments')).toHaveCount(0);
    await expect(root).toContainText('Core Commenter');
    await expect(root).toContainText('Approved nested response');
    await expect(root).not.toContainText('Private pending content');
    expect(await root.locator('.wp-block-comment-template li').count()).toBeGreaterThanOrEqual(2);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-comments-thread-inline-css') ||
      document.getElementById('slateframe-core-comments-thread-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await page.locator('html').evaluate((node, state) => {
            node.dir = state.dir; node.style.fontSize = state.font + 'px';
          }, { dir, font });
          const state = await root.evaluate(node => {
            const r = node.getBoundingClientRect();
            return {
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              left: r.left, right: r.right,
              links: [...node.querySelectorAll('.wp-block-comment-author-name a,.wp-block-comment-date a,.wp-block-comment-edit-link a,.wp-block-comment-reply-link a')].map(link => {
                const box = link.getBoundingClientRect();
                return { left: box.left, right: box.right, width: box.width, height: box.height,
                  wrap: getComputedStyle(link).overflowWrap };
              }),
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(state.links.length, label + ' links').toBeGreaterThan(0);
          for (const link of state.links) {
            expect(link.left, label + ' link left').toBeGreaterThanOrEqual(-1);
            expect(link.right, label + ' link right').toBeLessThanOrEqual(width + 1);
            expect(link.width, label + ' 44px width').toBeGreaterThanOrEqual(43);
            expect(link.height, label + ' 44px height').toBeGreaterThanOrEqual(43);
            expect(link.wrap, label + ' wrapping').toBe('anywhere');
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '64px'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const firstLink = root.locator('.wp-block-comment-author-name a').first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
    expect(await firstLink.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-core-thread-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await root.locator('.wp-block-comment-author-name').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/core-comments-thread-390-rtl-400.png',
      animations: 'disabled', fullPage: false });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = '16px'; });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    await root.locator('.wp-block-comment-author-name').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/core-comments-thread-1440-ltr.png',
      animations: 'disabled', fullPage: false });
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-comments-thread-inline-css') ||
      document.getElementById('slateframe-core-comments-thread-css')
    ))).toBe(false);
  } finally {
    if (pendingId) wp('comment', 'delete', pendingId, '--force');
    if (replyId) wp('comment', 'delete', replyId, '--force');
    if (approvedId) wp('comment', 'delete', approvedId, '--force');
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('Core Comments thread preserves native Gutenberg block serialization', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const state = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const children = ['core/comment-author-name', 'core/comment-date',
      'core/comment-content', 'core/comment-reply-link'].map(name => blocks.createBlock(name));
    const parent = blocks.createBlock('core/comments', {}, [
      blocks.createBlock('core/comment-template', {}, children)
    ]);
    const first = blocks.serialize([parent]), parsed = blocks.parse(first);
    return { first, second: blocks.serialize(parsed), name: parsed[0]?.name,
      valid: parsed[0]?.isValid, child: parsed[0]?.innerBlocks[0]?.name,
      children: parsed[0]?.innerBlocks[0]?.innerBlocks.map(b => b.name) };
  });
  expect(state.name).toBe('core/comments');
  expect(state.valid).toBe(true);
  expect(state.child).toBe('core/comment-template');
  expect(state.children).toEqual(['core/comment-author-name', 'core/comment-date',
    'core/comment-content', 'core/comment-reply-link']);
  expect(state.second).toBe(state.first);
});
