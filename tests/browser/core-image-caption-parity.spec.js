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

test('Core Image keeps native links, alt and captions inside responsive bounds', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-image-caption-' + randomUUID().slice(0, 12);
  const alt = '日本語 中文 العربية local image';
  const caption = '日本語 中文 العربية ' + 'LongUnbrokenCaption'.repeat(9);
  const screenshot = wp('eval', 'echo get_template_directory()."/screenshot.png";');
  let attachmentId;
  let postId;
  try {
    attachmentId = wp('media', 'import', screenshot, '--porcelain');
    const mediaUrl = wp('eval', 'echo wp_get_attachment_url(' + Number(attachmentId) + ');');
    const figure = (linked) => {
      const attributes = JSON.stringify({ id: Number(attachmentId), sizeSlug: 'full',
        linkDestination: linked ? 'media' : 'none' });
      const img = '<img src="' + mediaUrl + '" alt="' + alt +
        '" class="wp-image-' + attachmentId + '"/>';
      return '<!-- wp:image ' + attributes + ' -->' +
        '<figure class="wp-block-image size-full">' +
        (linked ? '<a href="' + mediaUrl + '">' + img + '</a>' : img) +
        '<figcaption class="wp-element-caption">' + caption + '</figcaption>' +
        '</figure><!-- /wp:image -->';
    };
    const content = '<!-- wp:group {"className":"slateframe-core-image-fixture"} -->' +
      '<div class="wp-block-group slateframe-core-image-fixture">' +
      figure(true) + figure(false) + '</div><!-- /wp:group -->';
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-core-image-fixture');
    await expect(root).toBeVisible();
    const figures = root.locator('figure.wp-block-image');
    await expect(figures).toHaveCount(2);
    const link = figures.first().locator('a');
    await expect(link).toHaveAttribute('href', mediaUrl);
    await expect(figures.last().locator('a')).toHaveCount(0);
    for (const figure of await figures.all()) {
      await expect(figure.locator('img')).toHaveAttribute('alt', alt);
      await expect(figure.locator('figcaption')).toHaveText(caption);
      expect(await figure.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-image-inline-css') ||
      document.getElementById('slateframe-core-image-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const state = await root.evaluate(node => {
            const figures = [...node.querySelectorAll('figure.wp-block-image')];
            return {
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
              items: figures.map(figure => {
                const image = figure.querySelector('img');
                const caption = figure.querySelector('figcaption');
                const a = figure.getBoundingClientRect(), b = image.getBoundingClientRect(),
                  c = caption.getBoundingClientRect();
                return { figureLeft: a.left, figureRight: a.right, imageLeft: b.left,
                  imageRight: b.right, imageWidth: b.width, captionLeft: c.left,
                  captionRight: c.right, captionHeight: c.height,
                  captionWrap: getComputedStyle(caption).overflowWrap,
                  captionFont: parseFloat(getComputedStyle(caption).fontSize) };
              }),
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.rootFont, label + ' computed root text').toBe(font);
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.items).toHaveLength(2);
          for (const item of state.items) {
            expect(item.figureLeft, label + ' figure left').toBeGreaterThanOrEqual(-1);
            expect(item.figureRight, label + ' figure right').toBeLessThanOrEqual(width + 1);
            expect(item.imageLeft, label + ' image left').toBeGreaterThanOrEqual(-1);
            expect(item.imageRight, label + ' image right').toBeLessThanOrEqual(width + 1);
            expect(item.imageWidth).toBeGreaterThan(0);
            expect(item.captionLeft, label + ' caption left').toBeGreaterThanOrEqual(-1);
            expect(item.captionRight, label + ' caption right').toBeLessThanOrEqual(width + 1);
            expect(item.captionHeight).toBeGreaterThan(0);
            expect(item.captionWrap).toBe('anywhere');
            expect(item.captionFont, label + ' readable caption text').toBeGreaterThanOrEqual(font * 0.75);
          }
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-image-caption-' + width + '-' + dir + '.png',
          });
          if (width === 390 && font === 64) {
            await link.scrollIntoViewIfNeeded();
            await link.focus();
            await expect(link).toBeFocused();
            expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
              .toBeGreaterThanOrEqual(2);
            await page.screenshot({ path: 'test-artifacts/screenshots/core-image-caption-390-' + dir + '-400.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(el => { el.dir = 'rtl'; el.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-core-image-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-image-caption-390-rtl-200-forced-colors.png' });
    await setRootTextScale(page, 64, 'rtl');
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await expect(link).toBeFocused();
    await page.screenshot({
      path: 'test-artifacts/screenshots/core-image-caption-390-rtl-400-forced-colors.png',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-image-inline-css') ||
      document.getElementById('slateframe-core-image-css'))).toBeNull();
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
    if (attachmentId) wp('post', 'delete', attachmentId, '--force');
  }
});

test('Core Image Gutenberg roundtrip keeps native caption and link settings', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/image')?.attributes;
    if (!schema) throw new Error('Native Core Image schema missing');
    const inputs = [
      { url: '/wp-content/themes/slateframe/screenshot.png', alt: '日本語 中文 العربية',
        caption: 'Native caption', linkDestination: 'media' },
      { url: '/wp-content/themes/slateframe/screenshot.png', alt: 'No link',
        caption: 'Unlinked caption', linkDestination: 'none' },
      { url: '/wp-content/themes/slateframe/screenshot.png', alt: 'Without caption',
        linkDestination: 'none' },
    ];
    const cases = inputs.map(input => {
      const first = blocks.serialize(blocks.createBlock('core/image', input));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { input, first, second, third: blocks.serialize(reparsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes,
        reparsedAttrs: reparsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/image');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    expect(entry.attrs.alt).toBe(entry.input.alt);
    expect(entry.attrs.linkDestination).toBe(entry.input.linkDestination);
  }
});
