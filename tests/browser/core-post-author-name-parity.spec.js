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

test('Core Post Author Name preserves native author links and responsive wrapping', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-post-author-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:group {"className":"slateframe-post-author-fixture"} -->' +
    '<div class="wp-block-group slateframe-post-author-fixture">' +
    '<!-- wp:post-author-name {"isLink":true} /-->' +
    '<!-- wp:post-author-name {"isLink":false} /-->' +
    '<!-- wp:post-author-name {"isLink":true,"linkTarget":"_blank"} /-->' +
    '</div><!-- /wp:group -->';
  // WP-CLI has no logged-in author by default; explicitly bind the real admin fixture.
  const authorId = wp('user', 'get', 'admin', '--field=ID');
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_author=' + authorId, '--post_title=' + slug,
    '--post_content=' + content, '--porcelain');
  try {
    const authorUrl = wp('eval', 'echo get_author_posts_url((int)get_post_field("post_author",' + Number(postId) + '));');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-post-author-fixture');
    await expect(root).toBeVisible();
    const authors = root.locator('.wp-block-post-author-name');
    await expect(authors).toHaveCount(3);
    const link = authors.first().locator('a');
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toBe(authorUrl);
    await expect(authors.nth(1).locator('a')).toHaveCount(0);
    expect((await authors.nth(1).innerText()).trim().length).toBeGreaterThan(0);
    await expect(authors.last().locator('a')).toHaveAttribute('target', '_blank');
    await expect(authors.last().locator('a')).toHaveAttribute('href', authorUrl);
    const originalHref = await link.getAttribute('href');
    await link.evaluate(el => {
      el.textContent = '日本語 中文 العربية ' + 'LongUnbrokenAuthorName'.repeat(6);
    });
    expect(await link.getAttribute('href')).toBe(originalHref);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-author-name-inline-css') ||
      document.getElementById('slateframe-core-post-author-name-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await setRootTextScale(page, font, dir);
          const metrics = await link.evaluate(el => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, height: r.height,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              wrap: getComputedStyle(el).overflowWrap };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(metrics.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(metrics.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(metrics.width, label + ' width').toBeGreaterThanOrEqual(43);
          expect(metrics.height, label + ' height').toBeGreaterThanOrEqual(43);
          expect(metrics.wrap, label + ' wrapping').toBe('anywhere');
          if (font === 16) {
            await root.screenshot({ path: 'test-artifacts/screenshots/core-post-author-name-' + width + '-' + dir + '.png' });
          }
          if (width === 390 && font === 64) {
            await link.scrollIntoViewIfNeeded();
            await page.screenshot({ path: 'test-artifacts/screenshots/core-post-author-name-390-' + dir + '-400.png', fullPage: false });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-post-author-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-post-author-name-390-rtl-200-forced-colors.png' });
    await setRootTextScale(page, 64, 'rtl');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: 'test-artifacts/screenshots/core-post-author-name-390-rtl-400-forced-colors.png', fullPage: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await link.click();
    await expect.poll(() => page.url()).toBe(authorUrl);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-post-author-name-inline-css') ||
      document.getElementById('slateframe-core-post-author-name-css'))).toBeNull();
  } finally { wp('post', 'delete', postId, '--force'); }
});

test('Core Post Author Name Gutenberg roundtrip keeps native link option', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-author-name')?.attributes;
    if (!schema) throw new Error('Native Core Post Author Name schema missing');
    const cases = [
      { isLink: true, linkTarget: '_blank' },
      { isLink: true, linkTarget: '_self' },
      { isLink: false },
    ].map(attrs => {
      const first = blocks.serialize(blocks.createBlock('core/post-author-name', attrs));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { first, second, third: blocks.serialize(reparsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes,
        reparsedAttrs: reparsed[0]?.attributes, input: attrs };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases,
      supportsLink: Object.prototype.hasOwnProperty.call(schema, 'isLink') };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/post-author-name');
    expect(entry.valid).toBe(true);
    expect(entry.first).toContain('<!-- wp:post-author-name');
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    if (result.supportsLink) expect(entry.attrs.isLink).toBe(entry.input.isLink);
    if (entry.input.linkTarget) expect(entry.attrs.linkTarget).toBe(entry.input.linkTarget);
  }
});
