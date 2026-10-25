const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core Avatar keeps native author context and responsive images', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable fixture covers seven widths');
  test.setTimeout(180000);
  const slug = 'slateframe-avatar-' + randomUUID().slice(0, 12);
  const authorId = wp('user', 'get', 'admin', '--field=ID');
  const content = '<!-- wp:group {"className":"slateframe-avatar-fixture"} -->' +
    '<div class="wp-block-group slateframe-avatar-fixture">' +
    '<!-- wp:avatar {"size":24,"isLink":true,"linkTarget":"_blank"} /-->' +
    '<!-- wp:avatar {"size":512,"isLink":false} /-->' +
    '</div><!-- /wp:group -->';
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_author=' + authorId, '--post_title=' + slug,
    '--post_content=' + content, '--porcelain');
  try {
    const localAvatar = wp('eval', 'echo get_template_directory()."/assets/images/pattern-placeholder-square.svg";');
    await page.route(/https?:\/\/[^/]*gravatar\.com\/avatar\//, route =>
      route.fulfill({ path: localAvatar, contentType: 'image/svg+xml' }));
    const authorUrl = wp('eval', 'echo get_author_posts_url(' + Number(authorId) + ');');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-avatar-fixture');
    const avatars = root.locator('.wp-block-avatar');
    await expect(avatars).toHaveCount(2);
    const link = avatars.first().locator('a.wp-block-avatar__link');
    await expect(link).toHaveAttribute('href', authorUrl);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(avatars.last().locator('a')).toHaveCount(0);
    const images = avatars.locator('img');
    await expect(images).toHaveCount(2);
    for (const img of await images.all()) {
      expect((await img.getAttribute('alt') || '').length).toBeGreaterThan(0);
      expect(await img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-avatar-inline-css') ||
      document.getElementById('slateframe-core-avatar-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((el, state) => {
            el.dir = state.dir; el.style.fontSize = state.font + 'px';
          }, { dir, font });
          const metrics = await root.evaluate(el => {
            const r = el.querySelector('.wp-block-avatar__link').getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, height: r.height,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              images: [...el.querySelectorAll('img')].map(img => {
                const b = img.getBoundingClientRect();
                return { left: b.left, right: b.right, width: b.width, height: b.height };
              }) };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.overflow, label + ' overflow').toBeLessThanOrEqual(1);
          expect(metrics.left, label + ' link left').toBeGreaterThanOrEqual(-1);
          expect(metrics.right, label + ' link right').toBeLessThanOrEqual(width + 1);
          expect(metrics.width, label + ' link width').toBeGreaterThanOrEqual(43);
          expect(metrics.height, label + ' link height').toBeGreaterThanOrEqual(43);
          for (const image of metrics.images) {
            expect(image.left, label + ' image left').toBeGreaterThanOrEqual(-1);
            expect(image.right, label + ' image right').toBeLessThanOrEqual(width + 1);
            expect(image.width, label + ' image width').toBeGreaterThan(0);
            expect(image.height, label + ' image height').toBeGreaterThan(0);
          }
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-avatar-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(el => { el.dir = 'rtl'; el.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-avatar-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await root.screenshot({ path: 'test-artifacts/screenshots/core-avatar-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(el => { el.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-avatar-inline-css') ||
      document.getElementById('slateframe-core-avatar-css'))).toBeNull();
  } finally {
    wp('post', 'delete', postId, '--force');
  }
});

test('Core Avatar Gutenberg roundtrip preserves size and link settings', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/avatar')?.attributes;
    if (!schema) throw new Error('Native Core Avatar schema missing');
    const cases = [
      { size: 24, isLink: true, linkTarget: '_blank' },
      { size: 512, isLink: false },
    ].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/avatar', input));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { input, second, third: blocks.serialize(reparsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes,
        reparsedAttrs: reparsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/avatar');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    expect(entry.attrs.size).toBe(entry.input.size);
    expect(entry.attrs.isLink).toBe(entry.input.isLink);
    if (entry.input.linkTarget) expect(entry.attrs.linkTarget).toBe(entry.input.linkTarget);
  }
});
