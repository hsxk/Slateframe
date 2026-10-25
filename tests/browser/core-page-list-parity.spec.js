const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('native Core Page List keeps published hierarchy and multilingual links', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-pages-' + randomUUID().slice(0, 12);
  const title = '日本語 中文 العربية ' + 'UnbrokenPageTitle'.repeat(6);
  const ids = [];
  try {
    const parent = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_name=' + slug + '-parent', '--post_title=' + title + ' parent', '--porcelain');
    ids.push(parent);
    const child = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_parent=' + parent, '--post_name=' + slug + '-child',
      '--post_title=' + title + ' child', '--porcelain');
    ids.push(child);
    const grandchild = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_parent=' + child, '--post_name=' + slug + '-grandchild',
      '--post_title=' + title + ' grandchild', '--porcelain');
    ids.push(grandchild);
    const draft = wp('post', 'create', '--post_type=page', '--post_status=draft',
      '--post_parent=' + parent, '--post_name=' + slug + '-draft',
      '--post_title=' + title + ' draft', '--porcelain');
    ids.push(draft);
    const content = '<!-- wp:group {"className":"slateframe-page-list-fixture"} -->' +
      '<div class="wp-block-group slateframe-page-list-fixture">' +
      '<!-- wp:navigation {"overlayMenu":"never","ariaLabel":"Page directory"} -->' +
      '<!-- wp:page-list /--><!-- /wp:navigation -->' +
      '</div><!-- /wp:group -->';
    const fixture = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_name=' + slug + '-fixture', '--post_title=Core Page List fixture',
      '--post_content=' + content, '--porcelain');
    ids.push(fixture);
    await page.goto('/?page_id=' + fixture, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-page-list-fixture');
    await expect(root).toBeVisible();
    const list = root.locator('.wp-block-page-list').first();
    await expect(list).toBeVisible();
    const links = list.locator('a[href]');
    const published = [parent, child, grandchild].map(id =>
      wp('eval', 'echo get_permalink(' + Number(id) + ');'));
    const draftURL = wp('eval', 'echo get_permalink(' + Number(draft) + ');');
    const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.href));
    for (const url of published) expect(hrefs).toContain(url);
    expect(hrefs).not.toContain(draftURL);
    expect(hrefs.filter(url => published.includes(url))).toHaveLength(3);
    const nested = await list.evaluate((node, urls) => {
      const parent = [...node.querySelectorAll('a[href]')].find(a => a.href === urls[0])?.closest('li');
      const child = parent && [...parent.querySelectorAll('li a[href]')].find(a => a.href === urls[1])?.closest('li');
      return Boolean(child && [...child.querySelectorAll('li a[href]')].some(a => a.href === urls[2]));
    }, published);
    expect(nested, 'Core preserves parent/child/grandchild hierarchy').toBe(true);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-page-list-inline-css') ||
      document.getElementById('slateframe-core-page-list-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await list.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            links: [...node.querySelectorAll('a[href]')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' overflow').toBeLessThanOrEqual(1);
          expect(state.links.length).toBeGreaterThanOrEqual(3);
          for (const link of state.links) {
            expect(link.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(link.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(link.width, label + ' target width').toBeGreaterThanOrEqual(43);
            expect(link.height, label + ' target height').toBeGreaterThanOrEqual(43);
            expect(link.wrap).toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await page.screenshot({ fullPage: true,
              path: 'test-artifacts/screenshots/core-page-list-' + width + '-' + dir + '.png' });
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
    const axe = await new AxeBuilder({ page }).include('.slateframe-page-list-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.first().focus();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-page-list-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await list.locator('a[href="' + published[1] + '"]').click();
    await expect.poll(() => page.url()).toBe(published[1]);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-page-list-inline-css') ||
      document.getElementById('slateframe-core-page-list-css'))).toBeNull();
  } finally {
    for (const id of ids.reverse()) wp('post', 'delete', id, '--force');
  }
});

test('Core Page List Gutenberg roundtrip preserves editor content', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    if (!blocks.getBlockType('core/page-list')) throw new Error('Core Page List missing');
    const first = blocks.serialize(blocks.createBlock('core/page-list'));
    const parsed = blocks.parse(first);
    return { before, after: blocks.serialize(editor.getBlocks()), first,
      second: blocks.serialize(parsed), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/page-list');
  expect(result.valid).toBe(true);
  expect(result.first).toBe(result.second);
  expect(result.first).toContain('wp:page-list');
});
