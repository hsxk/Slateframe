const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const multilingual = '日本語 中文 العربية ' + 'LongUnbrokenEditorialTitle'.repeat(7);

// Use an isolated Core category instead of relying on site-wide latest-post ordering.
test('Core Latest Posts keeps native list/grid, links and excerpts readable', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress category covers seven widths');
  test.setTimeout(150000);
  const ids = [];
  const slug = 'slateframe-latest-' + randomUUID().slice(0, 12);
  const category = wp('term', 'create', 'category', slug, '--slug=' + slug, '--porcelain');
  try {
    for (let i = 0; i < 3; i++) {
      const id = wp('post', 'create', '--post_type=post', '--post_status=publish',
        '--post_title=' + multilingual + ' ' + i,
        '--post_name=' + slug + '-' + i,
        '--post_content=<!-- wp:paragraph --><p>' + multilingual + '</p><!-- /wp:paragraph -->',
        '--porcelain');
      ids.push(id);
      wp('post', 'term', 'set', id, 'category', slug);
    }
    const attrs = (layout) => JSON.stringify({ categories: [{ id: Number(category) }], postsToShow: 3,
      displayPostDate: true, displayPostContent: true, displayPostContentRadio: 'excerpt', excerptLength: 20,
      postLayout: layout, ...(layout === 'grid' ? { columns: 3 } : {}) });
    const content = '<!-- wp:group {"className":"slateframe-latest-posts-fixture"} -->' +
      '<div class="wp-block-group slateframe-latest-posts-fixture">' +
      '<!-- wp:latest-posts ' + attrs('list') + ' /-->' +
      '<!-- wp:latest-posts ' + attrs('grid') + ' /-->' +
      '</div><!-- /wp:group -->';
    const pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Native Core Latest Posts fixture', '--post_content=' + content, '--porcelain');
    ids.push(pageId);
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-latest-posts-fixture');
    await expect(root).toBeVisible();
    const lists = root.locator('ul.wp-block-latest-posts');
    await expect(lists).toHaveCount(2);
    await expect(lists.first().locator('li')).toHaveCount(3);
    await expect(lists.last().locator('li')).toHaveCount(3);
    await expect(lists.last()).toHaveClass(/is-grid/);
    const links = root.locator('a.wp-block-latest-posts__post-title');
    await expect(links).toHaveCount(6);
    await expect(root.locator('.wp-block-latest-posts__post-date')).toHaveCount(6);
    await expect(root.locator('.wp-block-latest-posts__post-excerpt')).toHaveCount(6);
    const allowed = ids.slice(0, 3).map(id => wp('eval', 'echo get_permalink(' + Number(id) + ');'));
    const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.href));
    expect(hrefs.every(href => allowed.includes(href))).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const inline = document.getElementById('slateframe-core-latest-posts-inline-css');
      const external = document.getElementById('slateframe-core-latest-posts-css');
      return Boolean((inline && inline.textContent.includes('.wp-block-latest-posts')) ||
        (external && external.sheet));
    })).toBe(true);

    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, value) => {
          node.dir = value;
          node.style.fontSize = '16px';
        }, dir);
        const state = await root.evaluate(node => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          nodes: [...node.querySelectorAll('li,a.wp-block-latest-posts__post-title,.wp-block-latest-posts__post-excerpt')]
            .map(el => {
              const r = el.getBoundingClientRect();
              const p = el.parentElement.getBoundingClientRect();
              return { left: r.left, right: r.right, parentLeft: p.left, parentRight: p.right,
                width: r.width, height: r.height, wrap: getComputedStyle(el).overflowWrap, link: el.tagName === 'A' };
            }),
        }));
        const label = width + 'px ' + dir;
        expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
        for (const item of state.nodes) {
          expect(item.left, label + ' left').toBeGreaterThanOrEqual(item.parentLeft - 1);
          expect(item.right, label + ' right').toBeLessThanOrEqual(item.parentRight + 1);
          if (item.link) {
            expect(item.height, label + ' touch height').toBeGreaterThanOrEqual(43);
            expect(item.width, label + ' touch width').toBeGreaterThanOrEqual(43);
            expect(item.wrap, label + ' title wrapping').toBe('anywhere');
          }
        }
        if ([320, 390, 1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await root.screenshot({ path: 'test-artifacts/screenshots/core-latest-posts-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.keyboard.press('Tab');
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(await links.first().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    const axe = await new AxeBuilder({ page }).include('.slateframe-latest-posts-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-latest-posts-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-latest-posts-inline-css') ||
      document.getElementById('slateframe-core-latest-posts-css'))).toBeNull();
  } finally {
    for (const id of ids.reverse()) wp('post', 'delete', id, '--force');
    wp('term', 'delete', 'category', category);
  }
});

test('Core Latest Posts Gutenberg dynamic block round-trips without post edits', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    if (!blocks.getBlockType('core/latest-posts')) throw new Error('Native Latest Posts missing');
    const before = blocks.serialize(editor.getBlocks());
    const cases = ['list', 'grid'].map(postLayout => {
      const block = blocks.createBlock('core/latest-posts', {
        postLayout, postsToShow: 3, displayPostDate: true, displayPostContent: true,
        ...(postLayout === 'grid' ? { columns: 3 } : {}),
      });
      const first = blocks.serialize(block);
      const parsed = blocks.parse(first);
      return { first, second: blocks.serialize(parsed), count: parsed.length,
        valid: parsed[0]?.isValid, name: parsed[0]?.name, layout: parsed[0]?.attributes.postLayout };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.name).toBe('core/latest-posts');
    expect(entry.count).toBe(1);
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.first);
    expect(entry.first).toContain('wp:latest-posts');
    expect(entry.layout).toMatch(/^(list|grid)$/);
  }
});
