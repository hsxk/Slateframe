const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const { setRootTextScale } = require('./support/root-text-scale');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Separator retains Core variants, author colors, and RTL reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress post covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-separator-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:paragraph --><p><a class="slateframe-separator-before" href="#slateframe-separator-after">日本語 中文 العربية before the separators.</a></p><!-- /wp:paragraph -->' +
    '<!-- wp:separator {"className":"slateframe-separator-default"} --><hr class="wp-block-separator has-alpha-channel-opacity slateframe-separator-default"/><!-- /wp:separator -->' +
    '<!-- wp:separator {"className":"is-style-wide slateframe-separator-wide"} --><hr class="wp-block-separator has-alpha-channel-opacity is-style-wide slateframe-separator-wide"/><!-- /wp:separator -->' +
    '<!-- wp:separator {"className":"is-style-dots slateframe-separator-dots"} --><hr class="wp-block-separator has-alpha-channel-opacity is-style-dots slateframe-separator-dots"/><!-- /wp:separator -->' +
    '<!-- wp:separator {"className":"has-text-color slateframe-separator-authored"} --><hr class="wp-block-separator has-alpha-channel-opacity has-text-color slateframe-separator-authored" style="color:rgb(142, 43, 69)"/><!-- /wp:separator -->' +
    '<!-- wp:paragraph --><p><a id="slateframe-separator-after" class="slateframe-separator-after" href="#main-content">Following content remains in normal document order.</a></p><!-- /wp:paragraph -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const selectors = ['.slateframe-separator-default', '.slateframe-separator-wide',
      '.slateframe-separator-dots', '.slateframe-separator-authored'];
    for (const selector of selectors) {
      await expect(page.locator(selector)).toHaveJSProperty('tagName', 'HR');
      await expect(page.locator(selector)).toHaveRole('separator');
      await expect(page.locator(selector)).not.toHaveAttribute('tabindex');
    }
    const beforeLink = page.locator('.slateframe-separator-before');
    const afterLink = page.locator('.slateframe-separator-after');
    await beforeLink.focus();
    await beforeLink.press('Tab');
    await expect(afterLink).toBeFocused();
    await expect(page.locator(selectors[1])).toHaveClass(/is-style-wide/);
    await expect(page.locator(selectors[2])).toHaveClass(/is-style-dots/);
    const dots = await page.locator(selectors[2]).evaluate(node => getComputedStyle(node, '::before').content);
    expect(dots).not.toBe('none');
    await expect(page.locator(selectors[3])).toHaveClass(/has-text-color/);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-separator-inline-css') ||
      document.getElementById('slateframe-core-separator-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await setRootTextScale(page, font, dir);
          const result = await page.evaluate(selectors => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            separators: selectors.map(selector => {
              const node = document.querySelector(selector);
              const style = getComputedStyle(node);
              return { box: node.getBoundingClientRect().toJSON(),
                boxSizing: style.boxSizing, maxInlineSize: style.maxInlineSize,
                color: style.color };
            })
          }), selectors);
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(result.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          for (const separator of result.separators) {
            expect(separator.box.left, label + ' left bound').toBeGreaterThanOrEqual(-1);
            expect(separator.box.right, label + ' right bound').toBeLessThanOrEqual(width + 1);
            expect(separator.boxSizing).toBe('border-box');
            expect(separator.maxInlineSize).toBe('100%');
          }
          expect(result.separators[3].color, label + ' authored inline color').toBe('rgb(142, 43, 69)');
          if (font === 16) await page.screenshot({ fullPage: true,
            path: 'test-artifacts/screenshots/core-separator-' + width + '-' + dir + '.png' });
          if (width === 390 && font === 64) {
            await page.locator(selectors[1]).scrollIntoViewIfNeeded();
            await page.screenshot({ fullPage: false,
              path: 'test-artifacts/screenshots/core-separator-390-' + dir + '-400.png' });
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
    await beforeLink.focus();
    await beforeLink.press('Tab');
    await expect(afterLink).toBeFocused();
    expect(await afterLink.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-separator-390-rtl-200-forced-colors.png' });
    const color = await page.locator(selectors[0]).evaluate(node => getComputedStyle(node).color);
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
    await setRootTextScale(page, 64, 'rtl');
    await afterLink.scrollIntoViewIfNeeded();
    await page.screenshot({ fullPage: false,
      path: 'test-artifacts/screenshots/core-separator-390-rtl-400-forced-colors.png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-separator-inline-css') ||
      document.getElementById('slateframe-core-separator-css')
    ))).toBe(false);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Separator Gutenberg serialization preserves Core style classes', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const variants = ['is-style-wide', 'is-style-dots'].map(className => {
      const first = blocks.serialize(blocks.createBlock('core/separator', { className }));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      return { first, second, third: blocks.serialize(blocks.parse(second)),
        valid: parsed[0]?.isValid, name: parsed[0]?.name, className: parsed[0]?.attributes.className };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), variants };
  });
  expect(result.after).toBe(result.before);
  for (const [index, variant] of result.variants.entries()) {
    expect(variant.name).toBe('core/separator');
    expect(variant.valid).toBe(true);
    expect(variant.className).toContain(index ? 'is-style-dots' : 'is-style-wide');
    expect(variant.first).toBe(variant.second);
    expect(variant.second).toBe(variant.third);
  }
});
