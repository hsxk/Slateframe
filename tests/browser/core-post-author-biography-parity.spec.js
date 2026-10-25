const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core Post Author Biography preserves native author context and empty profile', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable author covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-biography-' + randomUUID().slice(0, 12);
  const biography = '日本語 中文 العربية ' + 'LongUnbrokenBiography'.repeat(9);
  const userId = wp('user', 'create', slug, slug + '@example.test', '--role=author', '--porcelain');
  let postId;
  try {
    wp('user', 'meta', 'update', userId, 'description', biography);
    const content = '<!-- wp:group {"className":"slateframe-author-biography-fixture"} -->' +
      '<div class="wp-block-group slateframe-author-biography-fixture">' +
      '<!-- wp:post-author-biography /--></div><!-- /wp:group -->';
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_author=' + userId, '--post_title=' + slug,
      '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-author-biography-fixture');
    const bio = root.locator('.wp-block-post-author-biography');
    await expect(bio).toHaveCount(1);
    await expect(bio).toContainText('日本語 中文 العربية');
    await expect(bio).toContainText('LongUnbrokenBiography');
    await expect(bio.locator('a')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-author-biography-inline-css') ||
      document.getElementById('slateframe-core-post-author-biography-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((el, state) => {
            el.dir = state.dir; el.style.fontSize = state.font + 'px';
          }, { dir, font });
          const metrics = await bio.evaluate(el => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, height: r.height,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              wrap: getComputedStyle(el).overflowWrap,
              inlineSize: getComputedStyle(el).maxInlineSize };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(metrics.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(metrics.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(metrics.height, label + ' biography visible').toBeGreaterThan(0);
          expect(metrics.wrap).toBe('anywhere');
          expect(metrics.inlineSize).toBe('100%');
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-post-author-biography-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(el => { el.dir = 'rtl'; el.style.fontSize = '32px'; });
    const axe = await new AxeBuilder({ page }).include('.slateframe-author-biography-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-post-author-biography-390-rtl-200-forced-colors.png',
    });
    await page.locator('html').evaluate(el => { el.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    wp('user', 'meta', 'delete', userId, 'description');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(root.locator('.wp-block-post-author-biography')).toHaveCount(0);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-post-author-biography-inline-css') ||
      document.getElementById('slateframe-core-post-author-biography-css'))).toBeNull();
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
    wp('user', 'delete', userId, '--yes');
  }
});

test('Core Post Author Biography Gutenberg roundtrip preserves Core attributes', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-author-biography')?.attributes;
    if (!schema) throw new Error('Native Core Post Author Biography schema missing');
    const cases = [{}, { textAlign: 'right' }, { textAlign: 'center' }].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/post-author-biography', input));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { input, first, second, third: blocks.serialize(reparsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes,
        reparsedAttrs: reparsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases,
      supportsAlign: Object.prototype.hasOwnProperty.call(schema, 'textAlign') };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/post-author-biography');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    if (result.supportsAlign && entry.input.textAlign) {
      expect(entry.attrs.textAlign).toBe(entry.input.textAlign);
    }
  }
});
