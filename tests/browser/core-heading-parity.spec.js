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

test('native Core Heading preserves levels, authored alignment and fragment targets at seven widths', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-heading-' + randomUUID().slice(0, 12);
  const japanese = '日本語中文'.repeat(28);
  const arabic = 'العربية'.repeat(32);
  const content = '<!-- wp:group {"className":"slateframe-heading-fixture"} -->' +
    '<div class="wp-block-group slateframe-heading-fixture">' +
    '<!-- wp:heading {"level":2,"anchor":"slateframe-heading-target"} -->' +
    '<h2 class="wp-block-heading" id="slateframe-heading-target">' + japanese + '</h2><!-- /wp:heading -->' +
    '<!-- wp:heading {"level":3,"textAlign":"center"} -->' +
    '<h3 class="wp-block-heading has-text-align-center">' + arabic + '</h3><!-- /wp:heading -->' +
    '<!-- wp:heading {"level":4} -->' +
    '<h4 class="wp-block-heading">Knowledge <a href="#slateframe-heading-target">jump to heading</a></h4><!-- /wp:heading -->' +
    '</div><!-- /wp:group -->';
  let id;
  try {
    id = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-heading-fixture');
    await expect(root).toBeVisible();
    const headings = root.locator('.wp-block-heading');
    await expect(headings).toHaveCount(3);
    for (const [index, level] of [2, 3, 4].entries()) {
      await expect(headings.nth(index)).toHaveJSProperty('tagName', 'H' + level);
    }
    await expect(headings.first()).toHaveAttribute('id', 'slateframe-heading-target');
    await expect(headings.nth(1)).toHaveClass(/has-text-align-center/);
    await expect(headings.last().locator('a')).toHaveAttribute('href', '#slateframe-heading-target');
    expect(await headings.first().evaluate(node => node.hasAttribute('tabindex'))).toBe(false);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-heading-inline-css') ||
      document.getElementById('slateframe-core-heading-css')
    ))).toBe(true);
    await headings.first().evaluate(node => { node.lang = 'ja'; });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await setRootTextScale(page, font, dir);
          const result = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            headings: [...node.querySelectorAll('.wp-block-heading')].map(heading => {
              const rect = heading.getBoundingClientRect(), style = getComputedStyle(heading);
              return { left: rect.left, right: rect.right, wrap: style.overflowWrap,
                scrollMargin: parseFloat(style.scrollMarginBlockStart),
                textAlign: style.textAlign, direction: style.direction, tracking: style.letterSpacing };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(result.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          for (const heading of result.headings) {
            expect(heading.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(heading.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(heading.wrap, label + ' wrap').toBe('anywhere');
            expect(heading.scrollMargin, label + ' sticky header offset').toBeGreaterThanOrEqual(44);
            expect(heading.direction, label + ' inherited direction').toBe(dir);
          }
          expect(result.headings[0].tracking, label + ' CJK tracking').toBe('normal');
          expect(result.headings[1].textAlign, label + ' authored alignment').toBe('center');
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-heading-' + width + '-' + dir + '.png',
          });
          if (width === 390 && font === 64) {
            await headings.first().scrollIntoViewIfNeeded();
            await page.screenshot({
              path: 'test-artifacts/screenshots/core-heading-390-' + dir + '-400.png',
              fullPage: false,
            });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await page.evaluate(() => { location.hash = '#slateframe-heading-target'; });
    await expect.poll(() => headings.first().evaluate(node => getComputedStyle(node).outlineStyle))
      .toBe('solid');
    const link = headings.last().locator('a');
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-heading-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const targetOutline = await headings.first().evaluate(node => ({
      style: getComputedStyle(node).outlineStyle,
      width: parseFloat(getComputedStyle(node).outlineWidth),
    }));
    expect(targetOutline.style).toBe('solid');
    expect(targetOutline.width).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-heading-390-rtl-200-forced-colors.png' });
    await setRootTextScale(page, 64, 'rtl');
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    // Footer block widgets contain Core Headings, so the 404 is not an asset-free page.
    // Isolate a blank Page by hiding footer widgets only for its unique request.
    const blankId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=' + slug + '-empty', '--post_content=', '--porcelain');
    const pluginDir = '/tmp/wp-browser/wp-content/mu-plugins';
    const pluginPath = pluginDir + '/slateframe-heading-isolation-' + slug + '.php';
    try {
      await fs.mkdir(pluginDir, { recursive: true });
      await fs.writeFile(pluginPath, [
        '<?php',
        'add_filter( "sidebars_widgets", static function ( $widgets ) {',
        '  if ( isset( $_GET["slateframe_heading_isolation"] ) && $_GET["slateframe_heading_isolation"] === "' + slug + '" ) {',
        '    $widgets["footer-content"] = array();',
        '  }',
        '  return $widgets;',
        '} );',
      ].join('\n') + '\n');
      await page.goto('/?page_id=' + blankId + '&slateframe_heading_isolation=' + slug,
        { waitUntil: 'networkidle' });
      await expect(page.locator('.wp-block-heading')).toHaveCount(0);
      expect(await page.evaluate(() => document.getElementById('slateframe-core-heading-inline-css') ||
        document.getElementById('slateframe-core-heading-css'))).toBeNull();
    } finally {
      await fs.rm(pluginPath, { force: true });
      wp('post', 'delete', blankId, '--force');
    }
  } finally {
    if (id) wp('post', 'delete', id, '--force');
  }
});

test('Core Heading Gutenberg roundtrip retains levels, anchors, text and authored alignment', async ({ page }, info) => {
  const id = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!id || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, id);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/heading')?.attributes;
    if (!schema) throw new Error('Native Core Heading schema missing');
    const inputs = [
      { level: 2, anchor: 'chapter-introduction', content: '日本語 中文 العربية' },
      { level: 3, ...(schema.textAlign ? { textAlign: 'center' } :
        { style: { typography: { textAlign: 'center' } } }), content: 'Centered knowledge chapter' },
      { level: 4, content: 'Portfolio methodology' },
    ];
    const cases = inputs.map(input => {
      const first = blocks.serialize(blocks.createBlock('core/heading', input));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { input, count: parsed.length, name: parsed[0]?.name, valid: parsed[0]?.isValid,
        attrs: parsed[0]?.attributes, reparsedAttrs: reparsed[0]?.attributes,
        second, third: blocks.serialize(reparsed) };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/heading');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    for (const [key, value] of Object.entries(entry.input)) {
      expect(entry.attrs[key], key).toEqual(value);
    }
  }
});
