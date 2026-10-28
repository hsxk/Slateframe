const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const { setRootTextScale } = require('./support/root-text-scale');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('Core Post Featured Image retains native image and permalink at seven widths', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress image covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-featured-image-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:group {"className":"slateframe-featured-image-fixture"} -->' +
    '<div class="wp-block-group slateframe-featured-image-fixture">' +
    '<!-- wp:post-featured-image {"isLink":true} /-->' +
    '<!-- wp:post-featured-image {"isLink":false} /-->' +
    '</div><!-- /wp:group -->';
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=' + slug, '--post_content=' + content, '--porcelain');
  let attachmentId;
  try {
    const screenshot = wp('eval', 'echo get_template_directory()."/screenshot.png";');
    attachmentId = wp('media', 'import', screenshot, '--post_id=' + postId, '--porcelain');
    wp('post', 'meta', 'update', postId, '_thumbnail_id', attachmentId);
    const attachmentAlt = '日本語 中文 العربية photo';
    wp('post', 'meta', 'update', attachmentId, '_wp_attachment_image_alt', attachmentAlt);
    expect(wp('post', 'meta', 'get', attachmentId, '_wp_attachment_image_alt')).toBe(attachmentAlt);
    const caption = '日本語 中文 العربية ' + 'UnbrokenCaptionSegment'.repeat(3);
    wp('post', 'update', attachmentId, '--post_excerpt=' + caption);
    const permalink = wp('eval', 'echo get_permalink(' + Number(postId) + ');');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-featured-image-fixture');
    await expect(root).toBeVisible();
    const hero = page.locator('.slateframe-entry-hero-image');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('fetchpriority', 'high');
    const heroCaption = page.locator('.slateframe-entry-hero figcaption');
    await expect(heroCaption).toHaveText(caption);
    const figures = root.locator('.wp-block-post-featured-image');
    await expect(figures).toHaveCount(2);
    const linked = figures.first().locator('a');
    await expect(linked).toHaveAttribute('href', permalink);
    await expect(figures.last().locator('a')).toHaveCount(0);
    const images = figures.locator('img');
    await expect(images).toHaveCount(2);
    // Core intentionally uses the post title as the linked image's alt text,
    // describing the link destination; unlinked images retain attachment alt.
    await expect(figures.first().locator('img')).toHaveAttribute('alt', slug);
    await expect(figures.last().locator('img')).toHaveAttribute('alt', attachmentAlt);
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute('src', /\/wp-content\/uploads\//);
      await expect(image).toHaveAttribute('srcset', /\s\d+w/);
      expect(await image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-featured-image-inline-css') ||
      document.getElementById('slateframe-core-post-featured-image-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const state = await root.evaluate(node => {
            const anchor = node.querySelector('.wp-block-post-featured-image a');
            const r = anchor.getBoundingClientRect();
            const imgs = [...node.querySelectorAll('img')].map(img => {
              const b = img.getBoundingClientRect();
              return { left: b.left, right: b.right, width: b.width };
            });
            return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
              direction: getComputedStyle(document.documentElement).direction,
              left: r.left, right: r.right, width: r.width, height: r.height, imgs };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.rootFont, label + ' computed root font').toBe(font);
          expect(state.direction, label + ' computed direction').toBe(dir);
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          // The theme's editorial hero must not crop a Core attachment when
          // its intrinsic height exceeds the viewport cap (e.g. at 1440px).
          const heroState = await hero.evaluate(img => {
            const rect = img.getBoundingClientRect();
            return {
              naturalRatio: img.naturalWidth / img.naturalHeight,
              renderedRatio: rect.width / rect.height,
              left: rect.left, right: rect.right, height: rect.height,
              objectFit: getComputedStyle(img).objectFit,
            };
          });
          expect(heroState.naturalRatio, label + ' natural ratio').toBeGreaterThan(0);
          expect(Math.abs(heroState.renderedRatio - heroState.naturalRatio),
            label + ' uncropped editorial hero').toBeLessThan(0.015);
          expect(heroState.objectFit, label + ' hero fit').toBe('contain');
          expect(heroState.left, label + ' hero left').toBeGreaterThanOrEqual(-1);
          expect(heroState.right, label + ' hero right').toBeLessThanOrEqual(width + 1);
          expect(heroState.height, label + ' bounded hero height').toBeLessThanOrEqual(703);
          const captionState = await heroCaption.evaluate(node => {
            const r = node.getBoundingClientRect();
            return { left: r.left, right: r.right, overflow: node.scrollWidth - node.clientWidth,
              align: getComputedStyle(node).textAlign };
          });
          expect(captionState.left, label + ' caption left').toBeGreaterThanOrEqual(-1);
          expect(captionState.right, label + ' caption right').toBeLessThanOrEqual(width + 1);
          expect(captionState.overflow, label + ' caption text overflow').toBeLessThanOrEqual(1);
          expect(['start', 'left', 'right'], label + ' caption logical alignment')
            .toContain(captionState.align);
          if (font === 16 && dir === 'ltr' && [390, 1440].includes(width)) {
            await page.locator('.slateframe-entry-hero').screenshot({
              path: 'test-artifacts/screenshots/entry-hero-natural-' + width + '-ltr.png',
            });
          }
          expect(state.left, label + ' link left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' link right').toBeLessThanOrEqual(width + 1);
          expect(state.width, label + ' target width').toBeGreaterThanOrEqual(43);
          expect(state.height, label + ' target height').toBeGreaterThanOrEqual(43);
          for (const img of state.imgs) {
            expect(img.left, label + ' image left').toBeGreaterThanOrEqual(-1);
            expect(img.right, label + ' image right').toBeLessThanOrEqual(width + 1);
            expect(img.width, label + ' image width').toBeGreaterThan(0);
          }
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-post-featured-image-' + width + '-' + dir + '.png'
          });
          if (width === 390 && font === 64) {
            await linked.scrollIntoViewIfNeeded();
            await linked.focus();
            await expect(linked).toBeFocused();
            expect(await linked.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
              .toBeGreaterThanOrEqual(2);
            await page.screenshot({
              path: 'test-artifacts/screenshots/core-post-featured-image-390-' + dir + '-400.png',
            });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await page.keyboard.press('Tab');
    await linked.focus();
    await expect(linked).toBeFocused();
    expect(await linked.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-featured-image-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await linked.focus();
    expect(await linked.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-post-featured-image-390-rtl-200-forced-colors.png' });
    await setRootTextScale(page, 64, 'rtl');
    await linked.scrollIntoViewIfNeeded();
    await linked.focus();
    await expect(linked).toBeFocused();
    expect(await linked.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({
      path: 'test-artifacts/screenshots/core-post-featured-image-390-rtl-400-forced-colors.png',
    });
    await page.locator('.slateframe-entry-hero').screenshot({
      path: 'test-artifacts/screenshots/entry-hero-natural-390-rtl-400-forced-colors.png',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await linked.click();
    await expect.poll(() => page.url()).toBe(permalink);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-post-featured-image-inline-css') ||
      document.getElementById('slateframe-core-post-featured-image-css'))).toBeNull();
  } finally {
    if (attachmentId) wp('post', 'delete', attachmentId, '--force');
    wp('post', 'delete', postId, '--force');
  }
});

test('Core Post Featured Image Gutenberg roundtrip keeps native link options', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-featured-image')?.attributes;
    if (!schema) throw new Error('Native Core Post Featured Image schema missing');
    const cases = [{ isLink: true }, { isLink: false }].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/post-featured-image', input));
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
    expect(entry.name).toBe('core/post-featured-image');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    if (result.supported.includes('isLink')) expect(entry.attrs.isLink).toBe(entry.input.isLink);
  }
});
