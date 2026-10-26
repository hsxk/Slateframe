const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('native Core List preserves numbering, nesting and multilingual reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-list-' + randomUUID().slice(0, 12);
  const long = '日本語中文'.repeat(30) + ' العربية'.repeat(15);
  const url = 'https://example.invalid/' + 'unbroken-identifier'.repeat(12);
  const content = '<!-- wp:group {"className":"slateframe-list-fixture"} -->' +
    '<div class="wp-block-group slateframe-list-fixture">' +
    '<!-- wp:list {"ordered":true,"start":4,"reversed":true,"className":"slateframe-list-ordered"} -->' +
    '<ol class="wp-block-list slateframe-list-ordered" start="4" reversed>' +
    '<li lang="ja">' + long + '</li><li>Second ordered item</li></ol><!-- /wp:list -->' +
    '<!-- wp:list {"className":"slateframe-list-unordered"} -->' +
    '<ul class="wp-block-list slateframe-list-unordered"><li lang="ar">العربية ' +
    '<a href="#slateframe-list-end">' + url + '</a>' +
    '<ul class="wp-block-list"><li lang="zh">中文 ' + long + '</li></ul></li></ul><!-- /wp:list -->' +
    '<!-- wp:paragraph --><p id="slateframe-list-end">End of list</p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:group -->';
  let id;
  try {
    id = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-list-fixture');
    await expect(root).toBeVisible();
    const lists = root.locator('.wp-block-list');
    await expect(lists).toHaveCount(3);
    const ordered = root.locator('ol.slateframe-list-ordered');
    await expect(ordered).toHaveAttribute('start', '4');
    expect(await ordered.evaluate(node => node.hasAttribute('reversed'))).toBe(true);
    await expect(root.locator('li')).toHaveCount(4);
    await expect(root.locator('a')).toHaveAttribute('href', '#slateframe-list-end');
    expect(await ordered.evaluate(node => getComputedStyle(node).listStyleType)).toBe('decimal');
    expect(await root.locator('ul.slateframe-list-unordered')
      .evaluate(node => getComputedStyle(node).listStyleType)).toBe('disc');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-list-inline-css') ||
      document.getElementById('slateframe-core-list-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [320, 390].includes(width) ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, state) => {
            node.dir = state.dir; node.style.fontSize = state.font + 'px';
          }, { dir, font });
          const state = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            lists: [...node.querySelectorAll('.wp-block-list')].map(list => {
              const rect = list.getBoundingClientRect(), style = getComputedStyle(list);
              return { left: rect.left, right: rect.right, wrap: style.overflowWrap,
                direction: style.direction, marker: style.listStyleType };
            }),
            items: [...node.querySelectorAll('li')].map(item => {
              const rect = item.getBoundingClientRect(), style = getComputedStyle(item);
              return { left: rect.left, right: rect.right, wrap: style.overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          for (const box of [...state.lists, ...state.items]) {
            expect(box.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(box.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(box.wrap, label + ' wrapping').toBe('anywhere');
          }
          expect(state.lists[0].direction, label + ' direction').toBe(dir);
          expect(state.lists[0].marker, label + ' ordered marker').toBe('decimal');
          expect(state.lists[1].marker, label + ' unordered marker').toBe('disc');
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-list-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    const link = root.locator('a');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
    const axe = await new AxeBuilder({ page }).include('.slateframe-list-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-list-390-rtl-200-forced-colors.png',
    });
    await page.emulateMedia({ forcedColors: 'none' });
    const blankId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=' + slug + '-empty', '--post_content=', '--porcelain');
    const pluginDir = '/tmp/wp-browser/wp-content/mu-plugins';
    const pluginPath = pluginDir + '/slateframe-list-isolation-' + slug + '.php';
    try {
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(pluginPath, [
        '<?php',
        'add_filter( "sidebars_widgets", static function ( $widgets ) {',
        '  if ( isset( $_GET["slateframe_list_isolation"] ) && $_GET["slateframe_list_isolation"] === "' + slug + '" ) {',
        '    $widgets["footer-content"] = array();',
        '  }',
        '  return $widgets;',
        '} );',
      ].join('\n') + '\n');
      await page.goto('/?page_id=' + blankId + '&slateframe_list_isolation=' + slug,
        { waitUntil: 'networkidle' });
      expect(await page.evaluate(() => document.getElementById('slateframe-core-list-inline-css') ||
        document.getElementById('slateframe-core-list-css'))).toBeNull();
    } finally {
      await fs.rm(pluginPath, { force: true });
      wp('post', 'delete', blankId, '--force');
    }
  } finally {
    if (id) wp('post', 'delete', id, '--force');
  }
});

test('Gutenberg native List serializes ordered items without editing the document', async ({ page }, info) => {
  const id = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!id || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, id);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/list')?.attributes;
    if (!schema || !blocks.getBlockType('core/list-item')) throw new Error('Native Core List schema missing');
    const attrs = { ordered: true, ...(schema.start ? { start: 4 } : {}),
      ...(schema.reversed ? { reversed: true } : {}) };
    const list = blocks.createBlock('core/list', attrs, [
      blocks.createBlock('core/list-item', { content: '日本語 中文 العربية' }),
      blocks.createBlock('core/list-item', { content: 'Second item' }),
    ]);
    const first = blocks.serialize(list);
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      valid: parsed[0]?.isValid, name: parsed[0]?.name,
      attributes: parsed[0]?.attributes, attrs, children: parsed[0]?.innerBlocks.map(child => ({
        name: child.name, valid: child.isValid, content: child.attributes.content,
      })) };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.valid).toBe(true);
  expect(result.name).toBe('core/list');
  expect(result.second).toBe(result.first);
  expect(result.third).toBe(result.second);
  for (const [key, value] of Object.entries(result.attrs)) {
    expect(result.attributes[key], key).toEqual(value);
  }
  expect(result.children).toHaveLength(2);
  for (const child of result.children) {
    expect(child.name).toBe('core/list-item');
    expect(child.valid).toBe(true);
  }
  expect(result.children[0].content).toContain('日本語 中文 العربية');
});
