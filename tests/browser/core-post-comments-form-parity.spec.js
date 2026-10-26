const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('native Comments Form preserves Core ownership and accessible responsive controls', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress post covers all widths');
  test.setTimeout(150000);
  const slug = 'slateframe-comments-form-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:post-comments-form {"className":"slateframe-native-form-fixture"} /-->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--comment_status=open', '--post_title=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.wp-block-post-comments-form.slateframe-native-form-fixture');
    const form = root.locator('form#commentform');
    const textarea = form.locator('textarea#comment');
    const submit = form.locator('#submit');
    await expect(root).toHaveCount(1);
    await expect(form).toHaveCount(1);
    await expect(textarea).toHaveCount(1);
    await expect(submit).toHaveCount(1);
    await expect(form.locator('label[for="comment"]')).toHaveCount(1);
    await expect(page.locator('.slateframe-comments')).toHaveCount(0);
    await expect(page.locator('form#commentform')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-comments-form-inline-css') ||
      document.getElementById('slateframe-core-post-comments-form-css')
    ))).toBe(true);
    await form.locator('label[for="comment"]').evaluate(node => {
      node.textContent = '日本語 中文 العربية ' + 'VeryLongUnbrokenCommentFormLabel'.repeat(6);
    });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const metrics = await textarea.evaluate(node => {
            const rect = node.getBoundingClientRect();
            return { left: rect.left, right: rect.right,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(metrics.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(metrics.right, label + ' right').toBeLessThanOrEqual(width + 1);
          const consentMetrics = await root.locator('.comment-form-cookies-consent').evaluate(node => {
            const checkbox = node.querySelector('input[type="checkbox"]');
            const consentLabel = node.querySelector('label');
            if (!checkbox || !consentLabel) throw new Error('Core consent control missing');
            const a = checkbox.getBoundingClientRect(), b = consentLabel.getBoundingClientRect();
            return { inputTop: a.top, labelTop: b.top,
              inputLeft: a.left, inputRight: a.right, labelLeft: b.left, labelRight: b.right };
          });
          expect(Math.abs(consentMetrics.inputTop - consentMetrics.labelTop),
            label + ' consent vertical alignment').toBeLessThanOrEqual(24);
          if (dir === 'ltr') {
            expect(consentMetrics.inputRight, label + ' consent reading order')
              .toBeLessThanOrEqual(consentMetrics.labelLeft + 1);
          } else {
            expect(consentMetrics.labelRight, label + ' consent RTL reading order')
              .toBeLessThanOrEqual(consentMetrics.inputLeft + 1);
          }
          expect(await submit.evaluate(node => node.getBoundingClientRect().height),
            label + ' submit target').toBeGreaterThanOrEqual(43);
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-post-comments-form-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await textarea.focus();
    await expect(textarea).toBeFocused();
    const axe = await new AxeBuilder({ page }).include('.slateframe-native-form-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-post-comments-form-390-rtl-200-forced-colors.png',
    });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    wp('post', 'update', postId, '--comment_status=closed');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('form#commentform')).toHaveCount(0);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-comments-form-inline-css') ||
      document.getElementById('slateframe-core-post-comments-form-css')
    ))).toBe(false);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Comments Form Gutenberg roundtrip leaves authored content unchanged', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    if (!blocks.getBlockType('core/post-comments-form')) {
      throw new Error('Native Core Post Comments Form is missing');
    }
    const first = blocks.serialize(blocks.createBlock('core/post-comments-form', {
      className: 'slateframe-comments-form-editor'
    }));
    const parsed = blocks.parse(first), second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid,
      className: parsed[0]?.attributes.className };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/post-comments-form');
  expect(result.valid).toBe(true);
  expect(result.className).toBe('slateframe-comments-form-editor');
  expect(result.second).toBe(result.third);
});
