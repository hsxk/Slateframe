const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('Core Site Title preserves native heading levels, linked titles and seven-width reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable post covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-site-title-' + randomUUID().slice(0, 12);
  const title = slug;
  const content = '<!-- wp:group {"className":"slateframe-site-title-fixture"} -->' +
    '<div class="wp-block-group slateframe-site-title-fixture">' +
    '<!-- wp:site-title {"isLink":true,"level":2} /-->' +
    '<!-- wp:site-title {"isLink":false,"level":3} /-->' +
    '</div><!-- /wp:group -->';
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=' + title, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
  try {
    const permalink = wp('eval', 'echo home_url();');
    const name = wp('option', 'get', 'blogname');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-site-title-fixture');
    await expect(root).toBeVisible();
    const headings = root.locator('.wp-block-site-title');
    await expect(headings).toHaveCount(2);
    await expect(headings.first()).toHaveJSProperty('tagName', 'H2');
    await expect(headings.last()).toHaveJSProperty('tagName', 'H3');
    await expect(headings.first()).toContainText(name);
    await expect(headings.last()).toContainText(name);
    const link = headings.first().locator('a');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', permalink);
    await expect(link).toHaveAttribute('rel', /home/);
    await expect(link).toHaveAttribute('target', '_self');
    await expect(headings.last().locator('a')).toHaveCount(0);
    // Stress only the disposable DOM, never the shared WordPress site title.
    await link.evaluate(el => { el.textContent = '日本語 中文 العربية ' + 'LongUnbrokenSiteTitle'.repeat(9); });
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-site-title-inline-css') ||
      document.getElementById('slateframe-core-site-title-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await root.evaluate(node => {
            const el = node.querySelector('.wp-block-site-title a');
            const rect = el.getBoundingClientRect();
            return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              left: rect.left, right: rect.right, width: rect.width, height: rect.height,
              wrap: getComputedStyle(el).overflowWrap };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(state.width, label + ' width').toBeGreaterThanOrEqual(43);
          expect(state.height, label + ' height').toBeGreaterThanOrEqual(43);
          expect(state.wrap, label + ' wrapping').toBe('anywhere');
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-site-title-' + width + '-' + dir + '.png'
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-site-title-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-site-title-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await link.click();
    await expect.poll(() => page.url()).toBe(new URL(permalink).href);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-site-title-inline-css') ||
      document.getElementById('slateframe-core-site-title-css'))).toBeNull();
  } finally {
    wp('post', 'delete', postId, '--force');
  }
});

test('Core Site Title Gutenberg roundtrip retains native heading and link options', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/site-title')?.attributes;
    if (!schema) throw new Error('Native Core Site Title schema missing');
    const cases = [
      { isLink: true, level: 2 },
      { isLink: false, level: 3 },
      { isLink: true, level: 4 },
    ].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/site-title', input));
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
    expect(entry.name).toBe('core/site-title');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    for (const key of ['isLink', 'level']) {
      if (result.supported.includes(key)) expect(entry.attrs[key]).toBe(entry.input[key]);
    }
  }
});
