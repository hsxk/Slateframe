const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Columns stack and reflow without losing authored content', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-columns-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:columns {"className":"slateframe-columns-fixture"} -->' +
    '<div class="wp-block-columns slateframe-columns-fixture">' +
    '<!-- wp:column --><div class="wp-block-column">' +
    '<!-- wp:paragraph --><p>日本語 中文 العربية VeryLongUnbrokenEditorialTokenRepeatedManyTimesVeryLongUnbrokenEditorialTokenRepeatedManyTimes</p><!-- /wp:paragraph -->' +
    '<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#slateframe-columns-target">Read the second column</a></div><!-- /wp:button --></div><!-- /wp:buttons -->' +
    '</div><!-- /wp:column -->' +
    '<!-- wp:column --><div class="wp-block-column">' +
    '<!-- wp:paragraph --><p id="slateframe-columns-target">Second column: multilingual publishing content</p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:column -->' +
    '</div><!-- /wp:columns -->' +
    '<!-- wp:columns {"isStackedOnMobile":false,"className":"slateframe-columns-no-stack"} -->' +
    '<div class="wp-block-columns is-not-stacked-on-mobile slateframe-columns-no-stack">' +
    '<!-- wp:column --><div class="wp-block-column"><!-- wp:paragraph --><p>日本語 LongUnbrokenTokenForColumns</p><!-- /wp:paragraph --></div><!-- /wp:column -->' +
    '<!-- wp:column --><div class="wp-block-column"><!-- wp:paragraph --><p>العربية LongUnbrokenTokenForColumns</p><!-- /wp:paragraph --></div><!-- /wp:column -->' +
    '</div><!-- /wp:columns -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-columns-fixture');
    const columns = root.locator(':scope > .wp-block-column');
    const unstacked = page.locator('.slateframe-columns-no-stack');
    await expect(unstacked.locator(':scope > .wp-block-column')).toHaveCount(2);
    await expect(columns).toHaveCount(2);
    await expect(columns.first()).toContainText('日本語 中文 العربية');
    const link = columns.first().locator('a.wp-block-button__link');
    await expect(link).toHaveAttribute('href', '#slateframe-columns-target');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-columns-inline-css') ||
      document.getElementById('slateframe-core-columns-css')
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
            root: node.getBoundingClientRect().toJSON(),
            columns: [...node.children].map(child => ({
              rect: child.getBoundingClientRect().toJSON(),
              minInline: getComputedStyle(child).minInlineSize,
              wrap: getComputedStyle(child).overflowWrap
            }))
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' horizontal document overflow').toBeLessThanOrEqual(1);
          expect(state.root.left, label + ' root left').toBeGreaterThanOrEqual(-1);
          expect(state.root.right, label + ' root right').toBeLessThanOrEqual(width + 1);
          expect(state.columns).toHaveLength(2);
          const unstackedState = await unstacked.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            columns: [...node.children].map(child => child.getBoundingClientRect().toJSON())
          }));
          expect(unstackedState.overflow, label + ' nonstacked overflow').toBeLessThanOrEqual(1);
          if (font === 16 && width <= 390) {
            expect(Math.abs(unstackedState.columns[0].left - unstackedState.columns[1].left), label + ' Core nonstacked option').toBeGreaterThan(10);
          }
          const target = await link.boundingBox();
          expect(target.width, label + ' control width').toBeGreaterThanOrEqual(43);
          expect(target.height, label + ' control height').toBeGreaterThanOrEqual(43);
          for (const item of state.columns) {
            expect(item.rect.left, label + ' column left').toBeGreaterThanOrEqual(-1);
            expect(item.rect.right, label + ' column right').toBeLessThanOrEqual(width + 1);
            expect(item.minInline).toBe('0px');
            expect(item.wrap).toBe('anywhere');
          }
          if (font === 16 && width <= 768) {
            expect(Math.abs(state.columns[0].rect.left - state.columns[1].rect.left), label + ' stacked columns').toBeLessThanOrEqual(2);
            expect(state.columns[1].rect.top, label + ' second column below first').toBeGreaterThan(state.columns[0].rect.bottom - 1);
          }
          if (font === 16 && width >= 1440) {
            expect(Math.abs(state.columns[0].rect.left - state.columns[1].rect.left), label + ' side-by-side columns').toBeGreaterThan(30);
          }
          if (font === 16) {
            await page.screenshot({ fullPage: true,
              path: 'test-artifacts/screenshots/core-columns-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-columns-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-columns-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Columns and Column Gutenberg serialization is non-destructive', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const root = blocks.createBlock('core/columns', { className: 'slateframe-columns-example' }, [
      blocks.createBlock('core/column', {}, [blocks.createBlock('core/paragraph', { content: '日本語 中文 العربية' })]),
      blocks.createBlock('core/column', {}, [blocks.createBlock('core/paragraph', { content: 'Second column' })])
    ]);
    const first = blocks.serialize(root);
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    const reparsed = blocks.parse(second);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(reparsed), count: parsed.length, name: parsed[0]?.name,
      valid: parsed[0]?.isValid, className: parsed[0]?.attributes.className,
      inner: parsed[0]?.innerBlocks.map(block => block.name) };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/columns');
  expect(result.valid).toBe(true);
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
  expect(result.className).toBe('slateframe-columns-example');
  expect(result.inner).toEqual(['core/column', 'core/column']);
});
