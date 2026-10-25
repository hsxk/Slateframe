const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core Archives list and dropdown preserve native month URLs and bounded controls', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-archives-' + randomUUID().slice(0, 12);
  const posts = [];
  let pageId;
  try {
    for (const [index, date] of ['2026-08-15 12:00:00', '2026-09-15 12:00:00'].entries()) {
      posts.push(wp('post', 'create', '--post_type=post', '--post_status=publish',
        '--post_title=' + slug + '-' + index, '--post_date=' + date, '--porcelain'));
    }
    const content = '<!-- wp:group {"className":"slateframe-archives-fixture"} -->' +
      '<div class="wp-block-group slateframe-archives-fixture">' +
      '<!-- wp:archives {"type":"monthly","showPostCounts":true} /-->' +
      '<!-- wp:archives {"type":"monthly","displayAsDropdown":true,"showPostCounts":true} /-->' +
      '</div><!-- /wp:group -->';
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Native Core Archives fixture', '--post_content=' + content, '--porcelain');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-archives-fixture');
    await expect(root).toBeVisible();
    const links = root.locator('ul.wp-block-archives-list a');
    const expected = [
      wp('eval', 'echo get_month_link(2026, 8);'),
      wp('eval', 'echo get_month_link(2026, 9);'),
    ];
    const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.href));
    for (const url of expected) expect(hrefs).toContain(url);
    expect(hrefs.filter(url => expected.includes(url))).toHaveLength(2);
    const select = root.locator('.wp-block-archives-dropdown select');
    await expect(select).toHaveCount(1);
    const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
    for (const url of expected) expect(options).toContain(url);
    await expect(select).toHaveAttribute('name', 'archive-dropdown');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-archives-inline-css') ||
      document.getElementById('slateframe-core-archives-css')
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
            controls: [...node.querySelectorAll('a,select')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap, tag: el.tagName };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' overflow').toBeLessThanOrEqual(1);
          expect(state.controls.length).toBeGreaterThanOrEqual(3);
          for (const item of state.controls) {
            expect(item.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(item.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(item.width, label + ' width').toBeGreaterThanOrEqual(43);
            expect(item.height, label + ' height').toBeGreaterThanOrEqual(43);
            if (item.tag === 'A') expect(item.wrap).toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await page.screenshot({ fullPage: true,
              path: 'test-artifacts/screenshots/core-archives-' + width + '-' + dir + '.png' });
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
    await select.focus();
    await expect(select).toBeFocused();
    const axe = await new AxeBuilder({ page }).include('.slateframe-archives-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.first().focus();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-archives-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await select.selectOption(expected[0]);
    await expect.poll(() => page.url()).toBe(expected[0]);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-site-footer .wp-block-archives')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-archives-inline-css') ||
      document.getElementById('slateframe-core-archives-css')
    ))).toBe(true);
  } finally {
    if (pageId) wp('post', 'delete', pageId, '--force');
    for (const post of posts.reverse()) wp('post', 'delete', post, '--force');
  }
});

test('Core Archives Gutenberg list/dropdown serialization is non-destructive', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/archives')?.attributes;
    if (!schema) throw new Error('Native Core Archives schema missing');
    const cases = [false, true].map(displayAsDropdown => {
      const first = blocks.serialize(blocks.createBlock('core/archives', {
        displayAsDropdown, showPostCounts: true, type: 'monthly',
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
    expect(entry.name).toBe('core/archives');
    expect(entry.valid).toBe(true);
    expect(entry.first).toBe(entry.second);
    expect(entry.attrs.showPostCounts).toBe(true);
    expect(entry.attrs.type).toBe('monthly');
    expect(entry.attrs.displayAsDropdown ?? false).toBe(index === 1);
  }
});
