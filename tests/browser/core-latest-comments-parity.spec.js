const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const multilingual = '日本語 中文 العربية ' + 'UnbrokenCommentName'.repeat(6);

test('native Core Latest Comments preserves approved comments, links and metadata', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-comments-' + randomUUID().slice(0, 12);
  const posts = [];
  const comments = [];
  try {
    const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_name=' + slug, '--post_title=' + multilingual,
      '--post_content=<!-- wp:paragraph --><p>Core comment fixture</p><!-- /wp:paragraph -->', '--porcelain');
    posts.push(postId);
    const home = wp('eval', 'echo home_url();');
    for (let i = 0; i < 3; i++) {
      comments.push(wp('comment', 'create', '--comment_post_ID=' + postId,
        '--comment_author=' + multilingual + ' ' + i,
        '--comment_author_email=fixture' + i + '@example.invalid',
        '--comment_author_url=' + home,
        '--comment_content=' + multilingual + ' comment ' + i,
        '--comment_approved=1', '--porcelain'));
    }
    const hidden = wp('comment', 'create', '--comment_post_ID=' + postId,
      '--comment_author=Unapproved fixture', '--comment_author_email=hidden@example.invalid',
      '--comment_content=Never publish this comment', '--comment_approved=0', '--porcelain');
    comments.push(hidden);
    const block = (attrs) => '<!-- wp:latest-comments ' + JSON.stringify(attrs) + ' /-->';
    const content = '<!-- wp:group {"className":"slateframe-latest-comments-fixture"} -->' +
      '<div class="wp-block-group slateframe-latest-comments-fixture">' +
      block({ commentsToShow: 8, displayAvatar: true, displayDate: true, displayExcerpt: true }) +
      block({ commentsToShow: 8, displayAvatar: false, displayDate: false, displayExcerpt: false }) +
      '</div><!-- /wp:group -->';
    const fixture = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_name=' + slug + '-fixture', '--post_title=Core Latest Comments fixture',
      '--post_content=' + content, '--porcelain');
    posts.push(fixture);
    // Prevent third-party requests in the disposable visual fixture.
    await page.route(/https?:\/\/[^/]*gravatar\.com\/avatar\//, route => route.fulfill({
      status: 200, contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="39" fill="#668578"/></svg>',
    }));
    await page.goto('/?page_id=' + fixture, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-latest-comments-fixture');
    await expect(root).toBeVisible();
    const lists = root.locator('.wp-block-latest-comments');
    await expect(lists).toHaveCount(2);
    const expected = comments.slice(0, 3).map(id =>
      wp('eval', 'echo get_comment_link(' + Number(id) + ');'));
    for (const list of [lists.first(), lists.last()]) {
      const links = list.locator('a.wp-block-latest-comments__comment-link');
      const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.href));
      for (const href of expected) expect(hrefs).toContain(href);
      expect(await list.innerText()).not.toContain('Never publish this comment');
      expect(await list.locator('li.wp-block-latest-comments__comment').count())
        .toBeGreaterThanOrEqual(3);
    }
    await expect(lists.first().locator('.wp-block-latest-comments__comment-date'))
      .toHaveCount(await lists.first().locator('li').count());
    await expect(lists.last().locator('.wp-block-latest-comments__comment-date')).toHaveCount(0);
    await expect(lists.first().locator('.wp-block-latest-comments__comment-excerpt').first())
      .toBeVisible();
    await expect(lists.last().locator('.wp-block-latest-comments__comment-excerpt')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-latest-comments-inline-css') ||
      document.getElementById('slateframe-core-latest-comments-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            links: [...node.querySelectorAll('.wp-block-latest-comments__comment-meta a')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.links.length, label + ' native comment links').toBeGreaterThanOrEqual(3);
          for (const link of state.links) {
            expect(link.left, label + ' link left').toBeGreaterThanOrEqual(-1);
            expect(link.right, label + ' link right').toBeLessThanOrEqual(width + 1);
            expect(link.width, label + ' link width').toBeGreaterThanOrEqual(43);
            expect(link.height, label + ' link height').toBeGreaterThanOrEqual(43);
            expect(link.wrap, label + ' long author/title wrapping').toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await page.screenshot({ fullPage: true,
              path: 'test-artifacts/screenshots/core-latest-comments-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    const first = root.locator('a.wp-block-latest-comments__comment-link').first();
    await page.keyboard.press('Tab');
    await first.focus();
    await expect(first).toBeFocused();
    expect(await first.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-latest-comments-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await first.focus();
    expect(await first.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-latest-comments-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await first.click();
    await expect.poll(() => page.url()).toBe(expected[2]);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-latest-comments-inline-css') ||
      document.getElementById('slateframe-core-latest-comments-css'))).toBeNull();
  } finally {
    for (const id of comments.reverse()) wp('comment', 'delete', id, '--force');
    for (const id of posts.reverse()) wp('post', 'delete', id, '--force');
  }
});

test('Core Latest Comments Gutenberg roundtrip preserves native settings', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/latest-comments')?.attributes;
    if (!schema) throw new Error('Native Core Latest Comments schema missing');
    const settings = { commentsToShow: 8, displayAvatar: false, displayDate: false, displayExcerpt: false };
    const first = blocks.serialize(blocks.createBlock('core/latest-comments', settings));
    const parsed = blocks.parse(first);
    return { before, after: blocks.serialize(editor.getBlocks()), first,
      second: blocks.serialize(parsed), count: parsed.length, name: parsed[0]?.name,
      valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes,
      supports: Object.keys(settings).filter(key => Object.prototype.hasOwnProperty.call(schema, key)),
      settings };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/latest-comments');
  expect(result.valid).toBe(true);
  expect(result.first).toBe(result.second);
  expect(result.first).toContain('wp:latest-comments');
  for (const key of Object.keys(result.settings)) {
    if (result.supports.includes(key)) expect(result.attrs[key]).toBe(result.settings[key]);
    else expect(result.first).not.toContain('"' + key + '"');
  }
});
