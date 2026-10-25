const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('Core Site Tagline retains WordPress description and multilingual reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-site-tagline-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:group {"className":"slateframe-site-tagline-fixture"} -->' +
    '<div class="wp-block-group slateframe-site-tagline-fixture">' +
    '<!-- wp:site-tagline {"className":"slateframe-tagline-primary"} /-->' +
    '<!-- wp:site-tagline {"className":"slateframe-tagline-secondary"} /-->' +
    '</div><!-- /wp:group -->';
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
  try {
    const description = wp('option', 'get', 'blogdescription');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-site-tagline-fixture');
    await expect(root).toBeVisible();
    const taglines = root.locator('.wp-block-site-tagline');
    await expect(taglines).toHaveCount(2);
    await expect(taglines.first()).toContainText(description);
    await expect(taglines.last()).toContainText(description);
    await expect(taglines.first().locator('a')).toHaveCount(0);
    await expect(taglines.first()).toHaveJSProperty('tagName', 'P');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-site-tagline-inline-css') ||
      document.getElementById('slateframe-core-site-tagline-css')
    ))).toBe(true);
    // Stress only the disposable DOM; never change WordPress blogdescription.
    await taglines.first().evaluate(el => {
      el.textContent = '日本語 中文 العربية ' + 'LongUnbrokenSiteTagline'.repeat(9);
    });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await taglines.first().evaluate(node => {
            const rect = node.getBoundingClientRect();
            return {
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              left: rect.left, right: rect.right,
              wrap: getComputedStyle(node).overflowWrap,
              whitespace: getComputedStyle(node).whiteSpace
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(state.wrap, label + ' wrapping').toBe('anywhere');
          expect(state.whitespace, label + ' whitespace').toBe('normal');
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-site-tagline-' + width + '-' + dir + '.png'
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    const axe = await new AxeBuilder({ page }).include('.slateframe-site-tagline-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-site-tagline-390-rtl-200-forced-colors.png'
    });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-site-tagline-inline-css') ||
      document.getElementById('slateframe-core-site-tagline-css'))).toBeNull();
  } finally {
    wp('post', 'delete', postId, '--force');
  }
});

test('Core Site Tagline Gutenberg roundtrip keeps native block attributes', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/site-tagline')?.attributes;
    if (!schema) throw new Error('Native Core Site Tagline schema missing');
    const cases = [{}, { className: 'slateframe-tagline-example' }].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/site-tagline', input));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { input, second, third: blocks.serialize(reparsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes,
        reparsedAttrs: reparsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases, supported: Object.keys(schema) };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/site-tagline');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    if (entry.input.className && result.supported.includes('className')) {
      expect(entry.attrs.className).toBe(entry.input.className);
    }
  }
});
