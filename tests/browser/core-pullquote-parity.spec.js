const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Pullquote solid variant preserves citations, keyboard order and multilingual reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-pullquote-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:paragraph --><p><a class="slateframe-pullquote-before" href="#slateframe-pullquote-after">Before</a></p><!-- /wp:paragraph -->' +
    '<!-- wp:pullquote {"className":"slateframe-pullquote-default"} --><figure class="wp-block-pullquote slateframe-pullquote-default"><blockquote><p>日本語 中文 العربية VeryLongUnbrokenPullquoteVeryLongUnbrokenPullquoteVeryLongUnbrokenPullquote</p><cite>Native citation — 作者</cite></blockquote></figure><!-- /wp:pullquote -->' +
    '<!-- wp:pullquote {"className":"is-style-solid-color slateframe-pullquote-solid","backgroundColor":"ink","textColor":"paper"} --><figure class="wp-block-pullquote is-style-solid-color slateframe-pullquote-solid has-paper-color has-ink-background-color has-text-color has-background"><blockquote><p>Solid quotation</p><cite>Solid citation</cite></blockquote></figure><!-- /wp:pullquote -->' +
    '<!-- wp:paragraph --><p><a id="slateframe-pullquote-after" class="slateframe-pullquote-after" href="#main-content">After</a></p><!-- /wp:paragraph -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const standard = page.locator('.slateframe-pullquote-default');
    const solid = page.locator('.slateframe-pullquote-solid');
    await expect(standard).toHaveJSProperty('tagName', 'FIGURE');
    await expect(solid).toHaveJSProperty('tagName', 'FIGURE');
    await expect(standard.locator('cite')).toHaveText('Native citation — 作者');
    await expect(solid.locator('cite')).toHaveText('Solid citation');
    await expect(solid).toHaveClass(/is-style-solid-color/);
    await expect(solid).toHaveClass(/has-ink-background-color/);
    await expect(solid).toHaveClass(/has-paper-color/);
    const authoredColors = await solid.evaluate(node => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, text: style.color };
    });
    expect(authoredColors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(authoredColors.background).not.toBe(authoredColors.text);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-pullquote-inline-css') ||
      document.getElementById('slateframe-core-pullquote-css')
    ))).toBe(true);
    const before = page.locator('.slateframe-pullquote-before');
    const after = page.locator('.slateframe-pullquote-after');
    await before.focus();
    await before.press('Tab');
    await expect(after).toBeFocused();
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, state) => {
            node.dir = state.dir; node.style.fontSize = state.font + 'px';
          }, { dir, font });
          const state = await page.evaluate(() => {
            const box = selector => {
              const node = document.querySelector(selector);
              const css = getComputedStyle(node);
              return { rect: node.getBoundingClientRect().toJSON(),
                border: parseFloat(css.borderInlineStartWidth),
                padding: parseFloat(css.paddingInlineStart), wrap: css.overflowWrap };
            };
            return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              standard: box('.slateframe-pullquote-default'), solid: box('.slateframe-pullquote-solid') };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          for (const quote of [state.standard, state.solid]) {
            expect(quote.rect.left, label + ' left bound').toBeGreaterThanOrEqual(-1);
            expect(quote.rect.right, label + ' right bound').toBeLessThanOrEqual(width + 1);
            expect(quote.wrap).toBe('anywhere');
          }
          if (font === 16) await page.screenshot({ fullPage: true,
            path: 'test-artifacts/screenshots/core-pullquote-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
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
      path: 'test-artifacts/screenshots/core-pullquote-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-pullquote-inline-css') ||
      document.getElementById('slateframe-core-pullquote-css')
    ))).toBe(false);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Pullquote Gutenberg roundtrip preserves Core solid variant', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const quote = blocks.createBlock('core/pullquote', {
      value: '日本語 中文 العربية quotation', citation: '作者', className: 'is-style-solid-color'
    });
    const first = blocks.serialize(quote);
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid,
      className: parsed[0]?.attributes.className,
      citation: parsed[0]?.attributes.citation };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/pullquote');
  expect(result.valid).toBe(true);
  expect(result.className).toBe('is-style-solid-color');
  expect(result.citation).toBe('作者');
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
});
