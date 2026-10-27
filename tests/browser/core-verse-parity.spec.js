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

test('native Verse preserves poetry line breaks, RTL direction and 400% reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-verse-' + randomUUID().slice(0, 12);
  const lineOne = '日本語 中文 العربية';
  const lineTwo = '    Indented poetry line';
  const unbroken = 'https://example.invalid/' + 'poetryreference'.repeat(25);
  const content = '<!-- wp:group {"className":"slateframe-verse-fixture"} -->' +
    '<div class="wp-block-group slateframe-verse-fixture">' +
    '<!-- wp:verse --><pre class="wp-block-verse" lang="ja">' +
    lineOne + '<br>' + lineTwo + '<br>' + unbroken +
    '</pre><!-- /wp:verse -->' +
    '<!-- wp:paragraph --><p>Following paragraph remains native.</p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:group -->';
  let id;
  try {
    id = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=Core Verse parity', '--post_name=' + slug,
      '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-verse-fixture');
    const verse = root.locator('pre.wp-block-verse');
    await expect(verse).toHaveCount(1);
    await expect(verse).toHaveAttribute('lang', 'ja');
    const originalText = await verse.textContent();
    await expect(verse.locator('br')).toHaveCount(2);
    expect(originalText).toContain(lineOne + lineTwo);
    expect(originalText).toContain(unbroken);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-verse-inline-css') ||
      document.getElementById('slateframe-core-verse-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await setRootTextScale(page, font, dir);
          const state = await verse.evaluate(node => {
            const rect = node.getBoundingClientRect();
            const css = getComputedStyle(node);
            return {
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              left: rect.left, right: rect.right,
              direction: css.direction, whiteSpace: css.whiteSpace,
              overflowWrap: css.overflowWrap, wordBreak: css.wordBreak,
              text: node.textContent,
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(state.direction, label + ' inherited direction').toBe(dir);
          expect(state.whiteSpace, label + ' line breaks').toBe('pre-wrap');
          expect(state.overflowWrap, label + ' long tokens').toBe('anywhere');
          expect(state.wordBreak, label + ' Unicode word breaking').toBe('normal');
          expect(state.text, label + ' preserved poetry').toBe(originalText);
          if (font === 16) {
            await root.screenshot({
              path: 'test-artifacts/screenshots/core-verse-' + width + '-' + dir + '.png',
            });
          }
          if (width === 390 && font === 64) {
            await verse.scrollIntoViewIfNeeded();
            await page.screenshot({ fullPage: false,
              path: 'test-artifacts/screenshots/core-verse-390-' + dir + '-400.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    const axe = await new AxeBuilder({ page }).include('.slateframe-verse-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    expect(await verse.evaluate(node => getComputedStyle(node).direction)).toBe('rtl');
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-verse-390-rtl-200-forced-colors.png',
    });
    await setRootTextScale(page, 64, 'rtl');
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await verse.scrollIntoViewIfNeeded();
    await page.screenshot({ fullPage: false,
      path: 'test-artifacts/screenshots/core-verse-390-rtl-400-forced-colors.png' });
    await page.emulateMedia({ forcedColors: 'none' });
    const blankId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=' + slug + '-empty', '--post_content=', '--porcelain');
    const pluginDir = '/tmp/wp-browser/wp-content/mu-plugins';
    const pluginPath = pluginDir + '/slateframe-verse-isolation-' + slug + '.php';
    try {
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(pluginPath, [
        '<?php',
        'add_filter( "sidebars_widgets", static function ( $widgets ) {',
        '  if ( isset( $_GET["slateframe_verse_isolation"] ) && $_GET["slateframe_verse_isolation"] === "' + slug + '" ) {',
        '    $widgets["footer-content"] = array();',
        '  }',
        '  return $widgets;',
        '} );',
      ].join('\n') + '\n');
      await page.goto('/?page_id=' + blankId + '&slateframe_verse_isolation=' + slug,
        { waitUntil: 'networkidle' });
      expect(await page.evaluate(() => document.getElementById('slateframe-core-verse-inline-css') ||
        document.getElementById('slateframe-core-verse-css'))).toBeNull();
    } finally {
      await fs.rm(pluginPath, { force: true });
      wp('post', 'delete', blankId, '--force');
    }
  } finally {
    if (id) wp('post', 'delete', id, '--force');
  }
});

test('Gutenberg native Verse serializes multilingual poetry without changing the document', async ({ page }, info) => {
  const id = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!id || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, id);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/verse')?.attributes;
    if (!schema || !schema.content) throw new Error('Native Core Verse schema unavailable');
    const verse = blocks.createBlock('core/verse', { content: '日本語<br>中文 العربية' });
    const first = blocks.serialize(verse);
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    return {
      before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)),
      count: parsed.length, name: parsed[0]?.name,
      valid: parsed[0]?.isValid, content: parsed[0]?.attributes.content,
    };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/verse');
  expect(result.valid).toBe(true);
  expect(result.second).toBe(result.first);
  expect(result.third).toBe(result.second);
  expect(result.content).toContain('日本語');
  expect(result.content).toContain('中文 العربية');
  expect(result.first).toContain('<br');
});
