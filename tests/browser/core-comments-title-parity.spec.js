const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('native Comments Title preserves approved counts and semantic multilingual headings', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-comments-title-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:comments {"className":"slateframe-comments-title-fixture"} -->' +
    '<div class="wp-block-comments slateframe-comments-title-fixture">' +
    '<!-- wp:comments-title {"showPostTitle":true,"showCommentsCount":true,"level":2} /-->' +
    '<!-- wp:comments-title {"showPostTitle":false,"showCommentsCount":true,"level":3} /-->' +
    '</div><!-- /wp:comments -->';
  let postId, approvedId, pendingId, secondApprovedId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--comment_status=open', '--post_title=' + slug, '--post_content=' + content, '--porcelain');
    approvedId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Slateframe Approved', '--comment_author_email=approved@example.org',
      '--comment_content=Approved native comment', '--comment_approved=1', '--porcelain');
    pendingId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Slateframe Pending', '--comment_author_email=pending@example.org',
      '--comment_content=Pending native comment', '--comment_approved=0', '--porcelain');
    expect(Number(wp('comment', 'list', '--post_id=' + postId, '--status=approve', '--format=count'))).toBe(1);
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-comments-title-fixture');
    const titles = root.locator('.wp-block-comments-title');
    await expect(titles).toHaveCount(2);
    await expect(titles.nth(0)).toHaveJSProperty('tagName', 'H2');
    await expect(titles.nth(1)).toHaveJSProperty('tagName', 'H3');
    await expect(titles.first()).toContainText(slug);
    expect((await titles.nth(1).innerText()).includes(slug)).toBe(false);
    const before = await titles.first().innerText();
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-comments-title-inline-css') ||
      document.getElementById('slateframe-core-comments-title-css')
    ))).toBe(true);
    secondApprovedId = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Slateframe Second', '--comment_author_email=second@example.org',
      '--comment_content=Second approved comment', '--comment_approved=1', '--porcelain');
    expect(Number(wp('comment', 'list', '--post_id=' + postId, '--status=approve', '--format=count'))).toBe(2);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(titles).toHaveCount(2);
    expect(await titles.first().innerText()).not.toBe(before);
    await titles.first().evaluate(node => {
      node.textContent = '日本語 中文 العربية ' + 'VeryLongUnbrokenCommentsHeading'.repeat(8);
    });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const metrics = await titles.first().evaluate(node => {
            const r = node.getBoundingClientRect();
            return { left: r.left, right: r.right, wrap: getComputedStyle(node).overflowWrap,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(metrics.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(metrics.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(metrics.wrap, label + ' wrapping').toBe('anywhere');
          if (font === 16) {
            await root.screenshot({ path: 'test-artifacts/screenshots/core-comments-title-' +
              width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    expect(await titles.first().getAttribute('tabindex')).toBeNull();
    const axe = await new AxeBuilder({ page }).include('.slateframe-comments-title-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await root.screenshot({ path: 'test-artifacts/screenshots/core-comments-title-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-comments-title-inline-css') ||
      document.getElementById('slateframe-core-comments-title-css')
    ))).toBe(false);
  } finally {
    if (secondApprovedId) wp('comment', 'delete', secondApprovedId, '--force');
    if (pendingId) wp('comment', 'delete', pendingId, '--force');
    if (approvedId) wp('comment', 'delete', approvedId, '--force');
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Comments Title Gutenberg roundtrip preserves Core options', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/comments-title')?.attributes;
    if (!schema) throw new Error('Native Core Comments Title schema missing');
    const cases = [
      { showPostTitle: true, showCommentsCount: true, level: 2 },
      { showPostTitle: false, showCommentsCount: false, level: 3 },
    ].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/comments-title', input));
      const parsed = blocks.parse(first), second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { input, first, second, third: blocks.serialize(reparsed),
        count: parsed.length, name: parsed[0]?.name, valid: parsed[0]?.isValid,
        attrs: parsed[0]?.attributes, reparsedAttrs: reparsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases,
      hasPostTitle: Object.prototype.hasOwnProperty.call(schema, 'showPostTitle'),
      hasCommentsCount: Object.prototype.hasOwnProperty.call(schema, 'showCommentsCount') };
  });
  expect(result.after).toBe(result.before);
  expect(result.hasPostTitle).toBe(true);
  expect(result.hasCommentsCount).toBe(true);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/comments-title');
    expect(entry.valid).toBe(true);
    expect(entry.first).toContain('<!-- wp:comments-title');
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    expect(entry.attrs.showPostTitle).toBe(entry.input.showPostTitle);
    expect(entry.attrs.showCommentsCount).toBe(entry.input.showCommentsCount);
    expect(entry.attrs.level).toBe(entry.input.level);
  }
});
