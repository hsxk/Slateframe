const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const { setRootTextScale } = require('./support/root-text-scale');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Quote plain variant preserves citations, keyboard order and multilingual reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-quote-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:paragraph --><p><a class="slateframe-quote-before" href="#slateframe-quote-after">Before</a></p><!-- /wp:paragraph -->' +
    '<!-- wp:quote {"className":"slateframe-quote-default"} --><blockquote class="wp-block-quote slateframe-quote-default"><!-- wp:paragraph --><p>日本語 中文 العربية VeryLongUnbrokenQuotedPassageVeryLongUnbrokenQuotedPassageVeryLongUnbrokenQuotedPassage</p><!-- /wp:paragraph --><cite>Native citation — 作者</cite></blockquote><!-- /wp:quote -->' +
    '<!-- wp:quote {"className":"is-style-plain slateframe-quote-plain"} --><blockquote class="wp-block-quote is-style-plain slateframe-quote-plain"><!-- wp:paragraph --><p>Plain quotation</p><!-- /wp:paragraph --><cite>Plain citation</cite></blockquote><!-- /wp:quote -->' +
    '<!-- wp:paragraph --><p><a id="slateframe-quote-after" class="slateframe-quote-after" href="#main-content">After</a></p><!-- /wp:paragraph -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const standard = page.locator('.slateframe-quote-default');
    const plain = page.locator('.slateframe-quote-plain');
    await expect(standard).toHaveJSProperty('tagName', 'BLOCKQUOTE');
    await expect(plain).toHaveJSProperty('tagName', 'BLOCKQUOTE');
    await expect(standard.locator('cite')).toHaveText('Native citation — 作者');
    await expect(plain.locator('cite')).toHaveText('Plain citation');
    await expect(plain).toHaveClass(/is-style-plain/);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-quote-inline-css') ||
      document.getElementById('slateframe-core-quote-css')
    ))).toBe(true);
    const before = page.locator('.slateframe-quote-before');
    const after = page.locator('.slateframe-quote-after');
    await before.focus();
    await before.press('Tab');
    await expect(after).toBeFocused();
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const state = await page.evaluate(() => {
            const box = selector => {
              const node = document.querySelector(selector);
              const css = getComputedStyle(node);
              return { rect: node.getBoundingClientRect().toJSON(),
                border: parseFloat(css.borderInlineStartWidth),
                padding: parseFloat(css.paddingInlineStart), wrap: css.overflowWrap };
            };
            return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              standard: box('.slateframe-quote-default'), plain: box('.slateframe-quote-plain') };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          for (const quote of [state.standard, state.plain]) {
            expect(quote.rect.left, label + ' left bound').toBeGreaterThanOrEqual(-1);
            expect(quote.rect.right, label + ' right bound').toBeLessThanOrEqual(width + 1);
            expect(quote.wrap).toBe('anywhere');
          }
          expect(state.plain.border, label + ' plain border').toBe(0);
          expect(state.plain.padding, label + ' plain padding').toBe(0);
          expect(state.standard.padding, label + ' bounded Core Quote inset')
            .toBeCloseTo(Math.min(font, 24), 1);
          if (font === 16) await page.screenshot({ fullPage: true,
            path: 'test-artifacts/screenshots/core-quote-' + width + '-' + dir + '.png' });
          if (width === 390 && font === 64) {
            await standard.scrollIntoViewIfNeeded();
            await page.screenshot({ fullPage: false,
              path: 'test-artifacts/screenshots/core-quote-390-' + dir + '-400.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    const axe = await new AxeBuilder({ page }).include('#main-content')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await before.focus();
    await before.press('Tab');
    await expect(after).toBeFocused();
    expect(await after.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-quote-390-rtl-200-forced-colors.png' });
    await setRootTextScale(page, 64, 'rtl');
    await page.screenshot({ fullPage: false,
      path: 'test-artifacts/screenshots/core-quote-390-rtl-400-forced-colors.png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-quote-inline-css') ||
      document.getElementById('slateframe-core-quote-css')
    ))).toBe(false);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Quote Gutenberg roundtrip preserves Core plain variant', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const quote = blocks.createBlock('core/quote', { className: 'is-style-plain' }, [
      blocks.createBlock('core/paragraph', { content: '日本語 中文 العربية quote' })
    ]);
    const first = blocks.serialize(quote);
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid,
      className: parsed[0]?.attributes.className,
      children: parsed[0]?.innerBlocks.map(block => block.name) };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/quote');
  expect(result.valid).toBe(true);
  expect(result.className).toBe('is-style-plain');
  expect(result.children).toEqual(['core/paragraph']);
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
});
