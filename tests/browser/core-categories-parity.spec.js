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
const name = '日本語 中文 العربية ' + 'LongUnbrokenCategoryLabel'.repeat(5);

test('Core Categories hierarchy and dropdown retain native queries and bounded controls', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-categories-' + randomUUID().slice(0, 12);
  const categories = [];
  const posts = [];
  let pageId;
  let originalSidebars;
  try {
    const parent = wp('term', 'create', 'category', name + ' parent', '--slug=' + slug, '--porcelain');
    categories.push(parent);
    const child = wp('term', 'create', 'category', name + ' child', '--slug=' + slug + '-child',
      '--parent=' + parent, '--porcelain');
    categories.push(child);
    for (const [index, category] of categories.entries()) {
      const post = wp('post', 'create', '--post_type=post', '--post_status=publish',
        '--post_title=Core taxonomy fixture ' + category, '--porcelain');
      posts.push(post);
      // WP-CLI interprets numeric term arguments as names; use the exact authored slug.
      const assignedSlug = index === 0 ? slug : slug + '-child';
      wp('post', 'term', 'set', post, 'category', assignedSlug);
    }
    const content = '<!-- wp:group {"className":"slateframe-categories-fixture"} -->' +
      '<div class="wp-block-group slateframe-categories-fixture">' +
      '<!-- wp:categories {"showHierarchy":true,"showPostCounts":true} /-->' +
      '<!-- wp:categories {"displayAsDropdown":true,"showHierarchy":true,"showPostCounts":true} /-->' +
      '</div><!-- /wp:group -->';
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Native Core Categories fixture', '--post_content=' + content, '--porcelain');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-categories-fixture');
    await expect(root).toBeVisible();
    const list = root.locator('ul.wp-block-categories-list');
    await expect(list).toHaveCount(1);
    const links = list.locator('a');
    // Core lists all nonempty site categories, including the default fixture category.
    expect(await links.count()).toBeGreaterThanOrEqual(2);
    const expected = categories.map(id => wp('eval', 'echo get_category_link(' + Number(id) + ');'));
    const actual = await links.evaluateAll(nodes => nodes.map(node => node.href));
    for (const url of expected) expect(actual).toContain(url);
    expect(actual.filter(url => expected.includes(url))).toHaveLength(2);
    // The authored child must remain nested under Core's hierarchy, not flattened.
    await expect(list.locator('ul.children a[href="' + expected[1] + '"]')).toHaveCount(1);
    const select = root.locator('.wp-block-categories-dropdown select');
    await expect(select).toHaveCount(1);
    await expect(select.locator('option[value="' + slug + '-child"]')).toHaveCount(1);
    await expect(select.locator('option[value="' + slug + '"]')).toHaveCount(1);
    await expect(select).toHaveAttribute('name', 'category_name');
    await expect.poll(() => page.evaluate(() => {
      const inline = document.getElementById('slateframe-core-categories-inline-css');
      const external = document.getElementById('slateframe-core-categories-css');
      return Boolean((inline && inline.textContent.includes('.wp-block-categories')) ||
        (external && external.sheet));
    })).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const state = await root.evaluate(node => ({
            rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
            control: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            controls: [...node.querySelectorAll('a,select')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap, bidi: getComputedStyle(el).unicodeBidi, tag: el.tagName };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.rootFont, label + ' computed root font').toBeCloseTo(font, 1);
          expect(state.control, label + ' bounded control token').toBeGreaterThanOrEqual(44);
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          // Other real WordPress categories may also render; test every link/select.
          expect(state.controls.length).toBeGreaterThanOrEqual(3);
          for (const item of state.controls) {
            expect(item.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(item.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(item.width, label + ' target width').toBeGreaterThanOrEqual(43);
            expect(item.height, label + ' target height').toBeGreaterThanOrEqual(43);
            if (item.tag === 'A') {
              expect(item.wrap).toBe('anywhere');
              expect(item.bidi, label + ' isolated category label').toBe('isolate');
            }
          }
          if (width === 390 && font === 64) {
            await select.focus();
            await select.scrollIntoViewIfNeeded();
            await expect(select).toBeInViewport();
            await page.screenshot({
              path: 'test-artifacts/screenshots/core-categories-390-' + dir + '-400.png',
              animations: 'disabled',
            });
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await page.screenshot({ fullPage: true, path: 'test-artifacts/screenshots/core-categories-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await page.keyboard.press('Tab');
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await select.focus();
    await expect(select).toBeFocused();
    const axe = await new AxeBuilder({ page }).include('.slateframe-categories-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.first().focus();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true, path: 'test-artifacts/screenshots/core-categories-390-rtl-200-forced-colors.png' });
    await setRootTextScale(page, 64, 'rtl');
    await select.focus();
    await select.scrollIntoViewIfNeeded();
    await expect(select).toBeInViewport();
    await page.screenshot({
      path: 'test-artifacts/screenshots/core-categories-390-rtl-400-forced-colors.png',
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    // Core dropdown values are category slugs; verify its native change handler navigates.
    await select.selectOption(slug + '-child');
    await expect.poll(() => page.url()).toContain(slug + '-child');
    // The default WordPress footer contains a real Core Categories widget on 404.
    // Its block asset must load there; a route alone cannot prove asset leakage.
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-site-footer .wp-block-categories')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-categories-inline-css') ||
      document.getElementById('slateframe-core-categories-css')
    ))).toBe(true);
    // Isolate the negative case by temporarily removing the disposable footer widgets.
    originalSidebars = wp('option', 'get', 'sidebars_widgets', '--format=json');
    const sidebars = JSON.parse(originalSidebars);
    if (!Array.isArray(sidebars['footer-content'])) throw new Error('Footer sidebar fixture missing');
    sidebars['footer-content'] = [];
    wp('option', 'update', 'sidebars_widgets', JSON.stringify(sidebars), '--format=json');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.wp-block-categories')).toHaveCount(0);
    expect(await page.evaluate(() => document.getElementById('slateframe-core-categories-inline-css') ||
      document.getElementById('slateframe-core-categories-css'))).toBeNull();
  } finally {
    if (originalSidebars) wp('option', 'update', 'sidebars_widgets', originalSidebars, '--format=json');
    if (pageId) wp('post', 'delete', pageId, '--force');
    for (const post of posts.reverse()) wp('post', 'delete', post, '--force');
    for (const category of categories.reverse()) wp('term', 'delete', 'category', category);
  }
});

test('Core Categories Gutenberg list/dropdown serialization is non-destructive', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/categories')?.attributes;
    if (!schema) throw new Error('Native Core Categories schema missing');
    const cases = [false, true].map(displayAsDropdown => {
      const first = blocks.serialize(blocks.createBlock('core/categories', {
        displayAsDropdown, showHierarchy: true, showPostCounts: true,
      }));
      const parsed = blocks.parse(first);
      return { first, second: blocks.serialize(parsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const [index, entry] of result.cases.entries()) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/categories');
    expect(entry.valid).toBe(true);
    expect(entry.first).toBe(entry.second);
    expect(entry.attrs.showHierarchy).toBe(true);
    expect(entry.attrs.showPostCounts).toBe(true);
    expect(entry.attrs.displayAsDropdown ?? false).toBe(index === 1);
  }
});
