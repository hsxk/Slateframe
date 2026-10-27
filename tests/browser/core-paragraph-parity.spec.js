const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Core Paragraph retains authored content and links across reflow and directions', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-paragraph-' + randomUUID().slice(0, 12);
  const long = '日本語中文'.repeat(22) + ' العربية'.repeat(12);
  const urlText = 'https://example.invalid/' + 'unbroken-identifier'.repeat(12);
  const content = '<!-- wp:group {"className":"slateframe-paragraph-fixture"} -->' +
    '<div class="wp-block-group slateframe-paragraph-fixture">' +
    '<!-- wp:paragraph {"className":"slateframe-paragraph-long"} -->' +
    '<p class="slateframe-paragraph-long" lang="ja">' + long + ' <a href="#slateframe-paragraph-end">' + urlText + '</a></p><!-- /wp:paragraph -->' +
    '<!-- wp:paragraph {"align":"center","className":"slateframe-paragraph-center"} -->' +
    '<p class="has-text-align-center slateframe-paragraph-center">Centered العربية 中文</p><!-- /wp:paragraph -->' +
    '<!-- wp:paragraph {"dropCap":true,"className":"slateframe-paragraph-dropcap"} -->' +
    '<p class="has-drop-cap slateframe-paragraph-dropcap">Native drop cap</p><!-- /wp:paragraph -->' +
    '<!-- wp:paragraph --><p id="slateframe-paragraph-end">End of article</p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:group -->';
  let id;
  try {
    id = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-paragraph-fixture');
    await expect(root).toBeVisible();
    const paragraphs = root.locator('p');
    await expect(paragraphs).toHaveCount(4);
    for (let i = 0; i < 4; i++) await expect(paragraphs.nth(i)).toHaveJSProperty('tagName', 'P');
    await expect(root.locator('.slateframe-paragraph-center')).toHaveClass(/has-text-align-center/);
    await expect(root.locator('.slateframe-paragraph-dropcap')).toHaveClass(/has-drop-cap/);
    await expect(root.locator('a')).toHaveAttribute('href', '#slateframe-paragraph-end');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-paragraph-inline-css') ||
      document.getElementById('slateframe-core-paragraph-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, state) => {
            node.dir = state.dir; node.style.fontSize = state.font + 'px';
          }, { dir, font });
          const state = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            boxes: [...node.querySelectorAll('p')].map(p => {
              const rect = p.getBoundingClientRect(), css = getComputedStyle(p);
              return { left: rect.left, right: rect.right, wrap: css.overflowWrap, dir: css.direction };
            }),
            alignment: getComputedStyle(node.querySelector('.slateframe-paragraph-center')).textAlign,
            dropCap: (() => {
              const paragraph = node.querySelector('.slateframe-paragraph-dropcap');
              return { size: parseFloat(getComputedStyle(paragraph, '::first-letter').fontSize),
                width: paragraph.getBoundingClientRect().width };
            })(),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          for (const box of state.boxes) {
            expect(box.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(box.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(box.wrap, label + ' wrap').toBe('anywhere');
            expect(box.dir, label + ' direction').toBe(dir);
          }
          expect(state.alignment, label + ' authored alignment').toBe('center');
          expect(state.dropCap.size, label + ' native drop cap size').toBeGreaterThan(0);
          expect(state.dropCap.size, label + ' bounded native drop cap').toBeLessThanOrEqual(state.dropCap.width + 1);
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-paragraph-' + width + '-' + dir + '.png',
          });
          if (width === 390 && font === 64) {
            await root.locator('.slateframe-paragraph-dropcap').scrollIntoViewIfNeeded();
            await page.screenshot({
              path: 'test-artifacts/screenshots/core-paragraph-390-' + dir + '-400.png',
              fullPage: false,
            });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    const link = root.locator('a');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
    const axe = await new AxeBuilder({ page }).include('.slateframe-paragraph-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-paragraph-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const blankId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=' + slug + '-empty', '--post_content=', '--porcelain');
    const pluginDir = '/tmp/wp-browser/wp-content/mu-plugins';
    const pluginPath = pluginDir + '/slateframe-paragraph-isolation-' + slug + '.php';
    try {
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(pluginPath, [
        '<?php',
        'add_filter( "sidebars_widgets", static function ( $widgets ) {',
        '  if ( isset( $_GET["slateframe_paragraph_isolation"] ) && $_GET["slateframe_paragraph_isolation"] === "' + slug + '" ) {',
        '    $widgets["footer-content"] = array();',
        '  }',
        '  return $widgets;',
        '} );',
      ].join('\n') + '\n');
      await page.goto('/?page_id=' + blankId + '&slateframe_paragraph_isolation=' + slug,
        { waitUntil: 'networkidle' });
      expect(await page.evaluate(() => document.getElementById('slateframe-core-paragraph-inline-css') ||
        document.getElementById('slateframe-core-paragraph-css'))).toBeNull();
    } finally {
      await fs.rm(pluginPath, { force: true });
      wp('post', 'delete', blankId, '--force');
    }
  } finally {
    if (id) wp('post', 'delete', id, '--force');
  }
});

test('native Core Paragraph Gutenberg roundtrip preserves inline text and supported alignment', async ({ page }, info) => {
  const id = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!id || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, id);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/paragraph')?.attributes;
    if (!schema) throw new Error('Native Core Paragraph schema missing');
    const attributes = {
      content: '日本語 中文 العربية <a href="#chapter">Read chapter</a>',
      dropCap: true,
      ...(schema.textAlign ? { textAlign: 'center' } :
        { style: { typography: { textAlign: 'center' } } }),
    };
    // Compare against the active WordPress Core save implementation, not a
    // hard-coded class: Core versions may serialize dropCap metadata without
    // emitting has-drop-cap on a programmatically created block.
    const nativeMarkup = blocks.getSaveContent('core/paragraph', attributes);
    const first = blocks.serialize(blocks.createBlock('core/paragraph', attributes));
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), name: parsed[0]?.name,
      valid: parsed[0]?.isValid, count: parsed.length, attrs: parsed[0]?.attributes,
      requested: attributes, nativeMarkup };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/paragraph');
  expect(result.valid).toBe(true);
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
  expect(result.attrs.content).toContain('日本語 中文 العربية');
  expect(result.attrs.content).toContain('href="#chapter"');
  expect(result.attrs.dropCap).toBe(true);
  expect(result.first).toContain('"dropCap":true');
  expect(result.nativeMarkup).toContain('<p');
  expect(result.nativeMarkup).toContain('日本語 中文 العربية');
  expect(result.first).toContain(result.nativeMarkup);
  for (const [key, value] of Object.entries(result.requested)) {
    expect(result.attrs[key], key).toEqual(value);
  }
});
