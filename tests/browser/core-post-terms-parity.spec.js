const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core Post Terms retains native taxonomy links and bounded multilingual controls', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-post-terms-' + randomUUID().slice(0, 12);
  const terms = [];
  let postId;
  try {
    for (const taxonomy of ['post_tag', 'category']) {
      for (let index = 0; index < 2; index++) {
        const name = '日本語 中文 العربية ' + 'UnbrokenTerm'.repeat(5) + ' ' + index;
        const termSlug = slug + '-' + taxonomy + '-' + index;
        const id = wp('term', 'create', taxonomy, name, '--slug=' + termSlug, '--porcelain');
        terms.push({ taxonomy, id, slug: termSlug });
      }
    }
    const content = '<!-- wp:group {"className":"slateframe-post-terms-fixture"} -->' +
      '<div class="wp-block-group slateframe-post-terms-fixture">' +
      '<!-- wp:post-terms {"term":"post_tag"} /-->' +
      '<!-- wp:post-terms {"term":"category"} /-->' +
      '</div><!-- /wp:group -->';
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_content=' + content, '--porcelain');
    for (const taxonomy of ['post_tag', 'category']) {
      wp('post', 'term', 'set', postId, taxonomy,
        ...terms.filter(term => term.taxonomy === taxonomy).map(term => term.slug));
    }
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-post-terms-fixture');
    await expect(root).toBeVisible();
    const groups = root.locator('.wp-block-post-terms');
    await expect(groups).toHaveCount(2);
    const expected = {};
    for (const taxonomy of ['post_tag', 'category']) {
      expected[taxonomy] = terms.filter(term => term.taxonomy === taxonomy).map(term =>
        wp('eval', 'echo get_term_link(' + Number(term.id) + ', "' + taxonomy + '");'));
    }
    for (const [index, taxonomy] of ['post_tag', 'category'].entries()) {
      const group = groups.nth(index);
      const hrefs = await group.locator('a').evaluateAll(nodes => nodes.map(node => node.href));
      for (const url of expected[taxonomy]) expect(hrefs).toContain(url);
      expect(hrefs.filter(url => expected[taxonomy].includes(url))).toHaveLength(2);
      await expect(group.locator('.wp-block-post-terms__separator')).toHaveCount(1);
    }
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-terms-inline-css') ||
      document.getElementById('slateframe-core-post-terms-css')
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
            links: [...node.querySelectorAll('.wp-block-post-terms a')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.links.length, label + ' native term links').toBe(4);
          for (const link of state.links) {
            expect(link.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(link.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(link.width, label + ' width').toBeGreaterThanOrEqual(43);
            expect(link.height, label + ' height').toBeGreaterThanOrEqual(43);
            expect(link.wrap, label + ' long term wrapping').toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await page.screenshot({ fullPage: true,
              path: 'test-artifacts/screenshots/core-post-terms-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    const first = groups.first().locator('a').first();
    await page.keyboard.press('Tab');
    await first.focus();
    await expect(first).toBeFocused();
    expect(await first.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-post-terms-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await first.focus();
    expect(await first.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-post-terms-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await first.click();
    await expect.poll(() => page.url()).toBe(expected.post_tag[0]);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-post-terms-inline-css') ||
      document.getElementById('slateframe-core-post-terms-css'))).toBeNull();
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
    for (const term of terms.reverse()) wp('term', 'delete', term.taxonomy, term.id);
  }
});

test('Core Post Terms Gutenberg roundtrip retains native taxonomy settings', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-terms')?.attributes;
    if (!schema) throw new Error('Native Core Post Terms schema missing');
    const cases = ['post_tag', 'category'].map(term => {
      const first = blocks.serialize(blocks.createBlock('core/post-terms', { term }));
      const parsed = blocks.parse(first);
      return { term, first, second: blocks.serialize(parsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases,
      supportsTerm: Object.prototype.hasOwnProperty.call(schema, 'term') };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/post-terms');
    expect(entry.valid).toBe(true);
    expect(entry.first).toBe(entry.second);
    if (result.supportsTerm) expect(entry.attrs.term).toBe(entry.term);
    else expect(entry.first).not.toContain('"term"');
  }
});
