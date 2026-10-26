const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Core Table retains fixed layout, caption and striped rows across viewports', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-table-' + randomUUID().slice(0, 12);
  const long = '日本語 中文 العربية ' + 'UnbrokenTableCell'.repeat(12);
  const caption = '比較表 日本語 中文 العربية ' + 'UnbrokenCaption'.repeat(9);
  const row = (tag, cells) => '<tr>' + cells.map(value => '<' + tag + '>' + value + '</' + tag + '>').join('') + '</tr>';
  const table = (fixed, klass) => '<!-- wp:table ' +
    JSON.stringify({ hasFixedLayout: fixed, className: klass }) + ' -->' +
    '<figure class="wp-block-table ' + klass + '"><table' + (fixed ? ' class="has-fixed-layout"' : '') +
    '><thead>' + row('th', ['名称', 'Value', 'ملاحظات', 'Summary']) + '</thead><tbody>' +
    row('td', [long, '<a href="#slateframe-table-target">Read table details</a>', '١٢٣٤٥٦٧٨٩٠', 'Summary']) +
    row('td', ['Second row', '200', long, 'Notes']) + '</tbody></table>' +
    '<figcaption class="wp-element-caption">' + caption + '</figcaption></figure><!-- /wp:table -->';
  const content = '<!-- wp:group {"className":"slateframe-table-fixture"} -->' +
    '<div class="wp-block-group slateframe-table-fixture">' +
    table(true, 'slateframe-table-fixed') + table(false, 'is-style-stripes slateframe-table-striped') +
    '<!-- wp:paragraph --><p id="slateframe-table-target">Table details</p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:group -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-table-fixture');
    const fixed = root.locator('.slateframe-table-fixed');
    const striped = root.locator('.slateframe-table-striped');
    await expect(fixed.locator('table.has-fixed-layout')).toHaveCount(1);
    await expect(striped.locator('table:not(.has-fixed-layout)')).toHaveCount(1);
    await expect(fixed.locator('th')).toHaveCount(4);
    await expect(striped.locator('tbody tr')).toHaveCount(2);
    await expect(fixed.locator('figcaption')).toHaveText(caption);
    const link = fixed.locator('td a');
    await expect(link).toHaveAttribute('href', '#slateframe-table-target');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-table-inline-css') ||
      document.getElementById('slateframe-core-table-css')
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
            figures: [...node.querySelectorAll('figure.wp-block-table')].map(figure => {
              const table = figure.querySelector('table');
              const caption = figure.querySelector('figcaption');
              const a = figure.getBoundingClientRect(), b = caption.getBoundingClientRect();
              return { left: a.left, right: a.right, scroll: figure.scrollWidth,
                client: figure.clientWidth, captionLeft: b.left, captionRight: b.right,
                captionWrap: getComputedStyle(caption).overflowWrap,
                captionAlign: getComputedStyle(caption).textAlign,
                cellWrap: getComputedStyle(table.querySelector('td')).overflowWrap,
                layout: getComputedStyle(table).tableLayout };
            })
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.figures).toHaveLength(2);
          for (const figure of state.figures) {
            expect(figure.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(figure.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(figure.captionLeft, label + ' caption left').toBeGreaterThanOrEqual(-1);
            expect(figure.captionRight, label + ' caption right').toBeLessThanOrEqual(width + 1);
            expect(figure.captionWrap, label + ' caption wrap').toBe('anywhere');
            expect(figure.captionAlign, label + ' caption alignment').toBe('start');
            expect(figure.cellWrap, label + ' cell wrap').toBe('anywhere');
            expect(figure.scroll, label + ' scroll containment').toBeGreaterThanOrEqual(figure.client);
          }
          expect(state.figures[0].layout, label + ' fixed layout').toBe('fixed');
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-table-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-table-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    expect(await striped.locator('tbody tr').first().evaluate(node =>
      parseFloat(getComputedStyle(node).borderBlockEndWidth))).toBeGreaterThanOrEqual(1);
    await link.focus();
    await root.screenshot({ path: 'test-artifacts/screenshots/core-table-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-table-inline-css') ||
      document.getElementById('slateframe-core-table-css'))).toBeNull();
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('Core Table Gutenberg roundtrip preserves native cells and authored layout', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const inputs = [
      { hasFixedLayout: true, caption: '日本語 中文 العربية fixed table',
        head: [{ cells: [{ content: 'Heading' }, { content: '見出し' }] }],
        body: [{ cells: [{ content: '123' }, { content: '本文' }] }] },
      { hasFixedLayout: false, className: 'is-style-stripes',
        body: [{ cells: [{ content: 'Arabic العربية' }, { content: '中文' }] }] }
    ];
    const cases = inputs.map(input => {
      const first = blocks.serialize(blocks.createBlock('core/table', input));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      return { input, first, second, third: blocks.serialize(blocks.parse(second)),
        count: parsed.length, name: parsed[0]?.name, valid: parsed[0]?.isValid,
        attrs: parsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const item of result.cases) {
    expect(item.count).toBe(1);
    expect(item.name).toBe('core/table');
    expect(item.valid).toBe(true);
    expect(item.first).toBe(item.second);
    expect(item.second).toBe(item.third);
    expect(item.attrs.hasFixedLayout).toBe(item.input.hasFixedLayout);
    expect(item.attrs.body).toEqual(item.input.body);
    if (item.input.head) expect(item.attrs.head).toEqual(item.input.head);
    if (item.input.className) expect(item.attrs.className).toBe(item.input.className);
  }
});
