const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('Core Read More preserves native Query Loop context and reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One fixture covers seven widths');
  test.setTimeout(180000);
  const marker = 'slateframe-read-more-' + randomUUID().slice(0, 12);
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish', '--post_title=' + marker,
    '--post_content=Read More fixture', '--porcelain');
  let pageId;
  try {
    const query = { perPage: 1, pages: 0, offset: 0, postType: 'post', order: 'desc', orderBy: 'date',
      author: '', search: marker, exclude: [], sticky: 'exclude', inherit: false };
    const content = '<!-- wp:query ' + JSON.stringify({ queryId: 0, query }) + ' -->' +
      '<div class="wp-block-query"><!-- wp:post-template -->' +
      '<!-- wp:group {"className":"slateframe-read-more-fixture"} -->' +
      '<div class="wp-block-group slateframe-read-more-fixture">' +
      '<!-- wp:read-more {"content":"Explore 日本語 中文 العربية","linkTarget":"_blank"} /-->' +
      '<!-- wp:read-more {"content":"Continue"} /-->' +
      '</div><!-- /wp:group --><!-- /wp:post-template --></div><!-- /wp:query -->';
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Slateframe Read More acceptance', '--post_content=' + content, '--porcelain');
    const permalink = wp('eval', 'echo get_permalink(' + Number(postId) + ');');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-read-more-fixture');
    await expect(root).toHaveCount(1);
    const links = root.locator('a.wp-block-read-more');
    await expect(links).toHaveCount(2);
    for (const link of [links.first(), links.last()]) await expect(link).toHaveAttribute('href', permalink);
    await expect(links.first()).toHaveAttribute('target', '_blank');
    await expect(links.first()).toContainText('Explore 日本語 中文 العربية');
    await expect(links.last()).toContainText('Continue');
    await expect(links.first().locator('.screen-reader-text')).toContainText(marker);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-read-more-inline-css') ||
      document.getElementById('slateframe-core-read-more-css')
    ))).toBe(true);
    const accessibleSuffix = await links.first().locator('.screen-reader-text').textContent();
    await links.first().evaluate(el => {
      for (const child of el.childNodes) if (child.nodeType === Node.TEXT_NODE) {
        child.textContent = '日本語 中文 العربية ' + 'UnbrokenReadMoreLabel'.repeat(8); break;
      }
    });
    expect(await links.first().locator('.screen-reader-text').textContent()).toBe(accessibleSuffix);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((el, v) => { el.dir = v.dir; el.style.fontSize = v.font + 'px'; },
            { dir, font });
          const state = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            links: [...node.querySelectorAll('a.wp-block-read-more')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' overflow').toBeLessThanOrEqual(1);
          for (const link of state.links) {
            expect(link.left, label).toBeGreaterThanOrEqual(-1);
            expect(link.right, label).toBeLessThanOrEqual(width + 1);
            expect(link.width, label).toBeGreaterThanOrEqual(43);
            expect(link.height, label).toBeGreaterThanOrEqual(43);
            expect(link.wrap, label).toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) await root.screenshot({
            path: 'test-artifacts/screenshots/core-read-more-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(el => { el.dir = 'rtl'; el.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-read-more-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.first().focus();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-read-more-390-rtl-200-forced-colors.png',
    });
    await page.locator('html').evaluate(el => { el.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await links.last().click();
    await expect.poll(() => page.url()).toBe(permalink);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-read-more-inline-css') ||
      document.getElementById('slateframe-core-read-more-css'))).toBeNull();
  } finally {
    if (pageId) wp('post', 'delete', pageId, '--force');
    wp('post', 'delete', postId, '--force');
  }
});

test('Core Read More Gutenberg serialization preserves content and target', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated editor fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/read-more')?.attributes;
    if (!schema) throw new Error('Native Core Read More schema missing');
    const cases = [{ content: 'Explore 日本語 中文 العربية', linkTarget: '_blank' },
      { content: 'Continue', linkTarget: '_self' }].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/read-more', input));
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
    expect(entry.name).toBe('core/read-more');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    for (const key of Object.keys(entry.input)) {
      if (result.supported.includes(key)) expect(entry.attrs[key]).toBe(entry.input[key]);
    }
  }
});
