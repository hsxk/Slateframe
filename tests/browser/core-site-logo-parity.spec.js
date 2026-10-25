const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core Site Logo retains native home links and media at seven widths', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable logo covers all widths');
  test.setTimeout(180000);
  const slug = 'slateframe-site-logo-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:group {"className":"slateframe-site-logo-fixture"} -->' +
    '<div class="wp-block-group slateframe-site-logo-fixture">' +
    '<!-- wp:site-logo {"width":96,"isLink":true} /-->' +
    '<!-- wp:site-logo {"width":96,"isLink":false} /-->' +
    '</div><!-- /wp:group -->';
  const previous = wp('eval', 'echo (int)get_theme_mod("custom_logo",0);');
  let attachmentId, postId;
  try {
    const screenshot = wp('eval', 'echo get_template_directory()."/screenshot.png";');
    attachmentId = wp('media', 'import', screenshot, '--porcelain');
    wp('eval', 'set_theme_mod("custom_logo",' + Number(attachmentId) + ');');
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_content=' + content, '--porcelain');
    const home = wp('eval', 'echo home_url("/");');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-site-logo-fixture');
    const logos = root.locator('.wp-block-site-logo');
    await expect(logos).toHaveCount(2);
    const link = logos.first().locator('a');
    await expect(link).toHaveAttribute('href', home);
    await expect(logos.last().locator('a')).toHaveCount(0);
    const imgs = logos.locator('img');
    await expect(imgs).toHaveCount(2);
    for (const img of await imgs.all()) {
      await expect(img).toHaveAttribute('src', /\/wp-content\/uploads\//);
      expect((await img.getAttribute('alt') || '').length).toBeGreaterThan(0);
      expect(await img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-site-logo-inline-css') ||
      document.getElementById('slateframe-core-site-logo-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((el, state) => {
            el.dir = state.dir; el.style.fontSize = state.font + 'px';
          }, { dir, font });
          const m = await root.evaluate(el => {
            const r = el.querySelector('.wp-block-site-logo a').getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, height: r.height,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              imgs: [...el.querySelectorAll('img')].map(img => {
                const b = img.getBoundingClientRect();
                return { left: b.left, right: b.right, width: b.width };
              }) };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(m.overflow, label + ' overflow').toBeLessThanOrEqual(1);
          expect(m.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(m.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(m.width, label + ' target width').toBeGreaterThanOrEqual(43);
          expect(m.height, label + ' target height').toBeGreaterThanOrEqual(43);
          for (const img of m.imgs) {
            expect(img.left).toBeGreaterThanOrEqual(-1);
            expect(img.right).toBeLessThanOrEqual(width + 1);
            expect(img.width).toBeGreaterThan(0);
          }
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-site-logo-' + width + '-' + dir + '.png'
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
    const axe = await new AxeBuilder({ page }).include('.slateframe-site-logo-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-site-logo-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(el => { el.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await link.click();
    await expect.poll(() => page.url()).toBe(home);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-site-logo-inline-css') ||
      document.getElementById('slateframe-core-site-logo-css'))).toBeNull();
  } finally {
    wp('eval', 'set_theme_mod("custom_logo",' + Number(previous) + ');');
    if (attachmentId) wp('post', 'delete', attachmentId, '--force');
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('Core Site Logo Gutenberg roundtrip preserves native options', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const r = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/site-logo')?.attributes;
    if (!schema) throw new Error('Native Site Logo schema missing');
    const cases = [{ width: 96, isLink: true }, { width: 64, isLink: false }].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/site-logo', input));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { input, first, second, third: blocks.serialize(reparsed),
        count: parsed.length, name: parsed[0]?.name, valid: parsed[0]?.isValid,
        attrs: parsed[0]?.attributes, reparsedAttrs: reparsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases, supported: Object.keys(schema) };
  });
  expect(r.after).toBe(r.before);
  for (const entry of r.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/site-logo');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    if (r.supported.includes('width')) expect(entry.attrs.width).toBe(entry.input.width);
    if (r.supported.includes('isLink')) expect(entry.attrs.isLink).toBe(entry.input.isLink);
  }
});
