const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native linked Core Image stays bounded with RTL, zoom and keyboard access', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers all widths');
  test.setTimeout(150000);
  const slug = 'slateframe-image-link-' + randomUUID().slice(0, 12);
  const src = wp('eval', 'echo get_template_directory_uri();') + '/screenshot.png';
  const content = '<!-- wp:paragraph --><p><a class="slateframe-image-before" href="#image-end">Before</a></p><!-- /wp:paragraph -->' +
    '<!-- wp:image {"sizeSlug":"full","linkDestination":"custom"} --><figure class="wp-block-image size-full"><a href="#image-end"><img src="' + src + '" alt="Linked image" /></a><figcaption>日本語 中文 العربية LongUnbrokenCaptionLongUnbrokenCaptionLongUnbrokenCaption</figcaption></figure><!-- /wp:image -->' +
    '<!-- wp:paragraph --><p><a id="image-end" class="slateframe-image-after" href="#main-content">After</a></p><!-- /wp:paragraph -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const figure = page.locator('.wp-block-image');
    const link = figure.locator('a');
    await expect(link.locator('img')).toHaveAttribute('alt', 'Linked image');
    await expect.poll(() => link.evaluate(node => getComputedStyle(node).display)).toBe('inline-block');
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const state = await page.evaluate(() => {
            const figure = document.querySelector('.wp-block-image');
            const anchor = figure.querySelector('a');
            const caption = figure.querySelector('figcaption');
            const rect = node => node.getBoundingClientRect().toJSON();
            return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              figure: rect(figure), anchor: rect(anchor), caption: rect(caption),
              maxInline: getComputedStyle(anchor).maxInlineSize,
              wrap: getComputedStyle(caption).overflowWrap };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' page overflow').toBeLessThanOrEqual(1);
          for (const box of [state.figure, state.anchor, state.caption]) {
            expect(box.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(box.right, label + ' right').toBeLessThanOrEqual(width + 1);
          }
          expect(state.maxInline).toBe('100%');
          expect(state.wrap).toBe('anywhere');
          if (width === 390 && (font === 16 || font === 64)) {
            await page.screenshot({ path: 'test-artifacts/screenshots/core-image-link-390-' + dir + '-' + font + '.png', fullPage: true });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await page.locator('.slateframe-image-before').focus();
    await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Tab');
    await expect(page.locator('.slateframe-image-after')).toBeFocused();
    const axe = await new AxeBuilder({ page }).include('#main-content')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: 'test-artifacts/screenshots/core-image-link-390-rtl-forced-colors.png', fullPage: true });
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});
