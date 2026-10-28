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

test('Core Tag Cloud retains native term links and bounded CJK/RTL controls', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-tags-' + randomUUID().slice(0, 12);
  const tags = [];
  const categories = [];
  const posts = [];
  let pageId;
  try {
    for (let index = 0; index < 3; index++) {
      const name = '日本語 中文 العربية ' + 'UnbrokenLongTag'.repeat(5) + ' ' + index;
      const tagSlug = slug + '-' + index;
      const tagId = wp('term', 'create', 'post_tag', name,
        '--slug=' + tagSlug, '--porcelain');
      tags.push({ id: tagId, slug: tagSlug });
      const categorySlug = slug + '-category-' + index;
      const categoryId = wp('term', 'create', 'category', name + ' category',
        '--slug=' + categorySlug, '--porcelain');
      categories.push({ id: categoryId, slug: categorySlug });
      for (let count = 0; count <= index; count++) {
        const post = wp('post', 'create', '--post_type=post', '--post_status=publish',
          '--post_title=' + slug + '-' + index + '-' + count, '--porcelain');
        posts.push(post);
        wp('post', 'term', 'set', post, 'post_tag', tagSlug);
        wp('post', 'term', 'set', post, 'category', categorySlug);
      }
    }
    const content = '<!-- wp:group {"className":"slateframe-tag-cloud-fixture"} -->' +
      '<div class="wp-block-group slateframe-tag-cloud-fixture">' +
      '<!-- wp:tag-cloud {"showTagCounts":true,"taxonomy":"post_tag"} /-->' +
      '<!-- wp:tag-cloud {"showTagCounts":true,"taxonomy":"category"} /-->' +
      '</div><!-- /wp:group -->';
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Native Core Tag Cloud fixture', '--post_content=' + content, '--porcelain');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-tag-cloud-fixture');
    await expect(root).toBeVisible();
    const clouds = root.locator('.wp-block-tag-cloud');
    await expect(clouds).toHaveCount(2);
    const cloud = clouds.first();
    const categoryCloud = clouds.last();
    const links = cloud.locator('a.tag-cloud-link');
    const expected = tags.map(tag => wp('eval', 'echo get_tag_link(' + Number(tag.id) + ');'));
    const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.href));
    for (const url of expected) expect(hrefs).toContain(url);
    expect(hrefs.filter(url => expected.includes(url))).toHaveLength(3);
    const categoryLinks = categoryCloud.locator('a.tag-cloud-link');
    const expectedCategories = categories.map(term => wp('eval',
      'echo get_category_link(' + Number(term.id) + ');'));
    const categoryHrefs = await categoryLinks.evaluateAll(nodes => nodes.map(node => node.href));
    for (const url of expectedCategories) expect(categoryHrefs).toContain(url);
    expect(categoryHrefs.filter(url => expectedCategories.includes(url))).toHaveLength(3);
    for (const [index, url] of expected.entries()) {
      const link = cloud.locator('a[href="' + url + '"]');
      await expect(link).toHaveAttribute('aria-label', /\(.+\)/);
      await expect(link.locator('.tag-link-count')).toContainText(String(index + 1));
    }
    // Native inline count can wrap if numeric values exceed the viewport.
    expect(await links.first().evaluate(el => getComputedStyle(el).display)).toBe('inline-block');
    expect(await links.first().locator('.tag-link-count').evaluate(el =>
      getComputedStyle(el).whiteSpace)).toBe('normal');
    // Core owns the variable per-term font sizes.
    const sizes = await links.evaluateAll(nodes => nodes.map(node => node.style.fontSize));
    expect(new Set(sizes.filter(Boolean)).size).toBeGreaterThan(1);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-tag-cloud-inline-css') ||
      document.getElementById('slateframe-core-tag-cloud-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir;
            node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            links: [...node.querySelectorAll('a.tag-cloud-link')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.links.length).toBeGreaterThanOrEqual(6);
          for (const item of state.links) {
            expect(item.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(item.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(item.width, label + ' width').toBeGreaterThanOrEqual(43);
            expect(item.height, label + ' height').toBeGreaterThanOrEqual(43);
            expect(item.wrap).toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await page.screenshot({ fullPage: true,
              path: 'test-artifacts/screenshots/core-tag-cloud-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-tag-cloud-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.first().focus();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-tag-cloud-390-rtl-200-forced-colors.png' });
    await setRootTextScale(page, 64, 'rtl');
    // Core controls per-term absolute font sizes: stress only the rendered DOM.
    const stressLink = links.first();
    const stressCount = stressLink.locator('.tag-link-count');
    const nativeCount = await stressCount.textContent();
    const nativeStyle = await stressLink.getAttribute('style');
    await stressCount.evaluate(node => { node.textContent = '(' + '1234567890'.repeat(3) + ')'; });
    await stressLink.evaluate(node => node.style.setProperty('font-size', '64px', 'important'));
    for (const viewportWidth of [320, 390]) {
      await page.setViewportSize({ width: viewportWidth, height: 900 });
      const state = await stressLink.evaluate(node => {
        const r = node.getBoundingClientRect();
        return {
          rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
          linkFont: parseFloat(getComputedStyle(node).fontSize),
          countWhiteSpace: getComputedStyle(node.querySelector('.tag-link-count')).whiteSpace,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          left: r.left, right: r.right, width: r.width, height: r.height,
        };
      });
      const label = viewportWidth + 'px RTL 400% Tag Cloud count';
      expect(state.rootFont, label + ' root font').toBe(64);
      expect(state.linkFont, label + ' link font').toBe(64);
      expect(state.countWhiteSpace, label + ' wrapping').toBe('normal');
      expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
      expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
      expect(state.right, label + ' right').toBeLessThanOrEqual(viewportWidth + 1);
      expect(state.width, label + ' width').toBeGreaterThanOrEqual(43);
      expect(state.height, label + ' height').toBeGreaterThanOrEqual(43);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await stressLink.scrollIntoViewIfNeeded();
    await stressLink.focus();
    await expect(stressLink).toBeFocused();
    await page.screenshot({
      path: 'test-artifacts/screenshots/core-tag-cloud-count-390-rtl-400-forced-colors.png',
      fullPage: false,
    });
    await stressCount.evaluate((node, value) => { node.textContent = value; }, nativeCount);
    await stressLink.evaluate((node, value) => {
      if (value === null) node.removeAttribute('style');
      else node.setAttribute('style', value);
    }, nativeStyle);
    await page.emulateMedia({ forcedColors: 'none' });
    await cloud.locator('a[href="' + expected[0] + '"]').click();
    await expect.poll(() => page.url()).toBe(expected[0]);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-tag-cloud-inline-css') ||
      document.getElementById('slateframe-core-tag-cloud-css'))).toBeNull();
  } finally {
    if (pageId) wp('post', 'delete', pageId, '--force');
    for (const post of posts.reverse()) wp('post', 'delete', post, '--force');
    for (const tag of tags.reverse()) wp('term', 'delete', 'post_tag', tag.id);
    for (const category of categories.reverse()) wp('term', 'delete', 'category', category.id);
  }
});

test('Core Tag Cloud Gutenberg serialization retains Core-owned taxonomy', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/tag-cloud')?.attributes;
    if (!schema) throw new Error('Native Core Tag Cloud schema missing');
    const cases = ['post_tag', 'category'].map(taxonomy => {
      const first = blocks.serialize(blocks.createBlock('core/tag-cloud',
        { showTagCounts: true, taxonomy }));
      const parsed = blocks.parse(first);
      return { taxonomy, first, second: blocks.serialize(parsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases,
      supportsCounts: Object.prototype.hasOwnProperty.call(schema, 'showTagCounts'),
      supportsTaxonomy: Object.prototype.hasOwnProperty.call(schema, 'taxonomy') };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.name).toBe('core/tag-cloud');
    expect(entry.count).toBe(1);
    expect(entry.valid).toBe(true);
    expect(entry.first).toBe(entry.second);
    if (result.supportsCounts) expect(entry.attrs.showTagCounts).toBe(true);
    else expect(entry.first).not.toContain('"showTagCounts"');
    if (result.supportsTaxonomy) expect(entry.attrs.taxonomy).toBe(entry.taxonomy);
    else expect(entry.first).not.toContain('"taxonomy"');
  }
});
