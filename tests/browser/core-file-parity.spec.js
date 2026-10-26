const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('native Core File preserves download semantics and responsive links', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-core-file-' + randomUUID().slice(0, 12);
  const href = wp('eval', 'echo get_template_directory_uri() . "/readme.txt";');
  const label = '日本語 中文 العربية ' + 'LongUnbrokenDocumentName'.repeat(8);
  const content = '<!-- wp:file {"href":' + JSON.stringify(href) + ',"showDownloadButton":true,"downloadButtonText":"Download / 下载"} -->' +
    '<div class="wp-block-file slateframe-file-fixture"><a href="' + href + '">' + label +
    '</a><a href="' + href + '" class="wp-block-file__button wp-element-button" download>Download / 下载</a></div><!-- /wp:file -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?page_id=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-file-fixture');
    await expect(root).toHaveCount(1);
    const links = root.locator('a');
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) await expect(link).toHaveAttribute('href', href);
    await expect(links.nth(1)).toHaveAttribute('download', '');
    await expect(links.nth(1)).toHaveClass(/wp-block-file__button/);
    expect(await links.first().innerText()).toBe(label);
    const response = await page.request.get(href);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('Slateframe');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-file-inline-css') ||
      document.getElementById('slateframe-core-file-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const metrics = await links.evaluateAll(nodes => nodes.map(node => {
            const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
            return { left: rect.left, right: rect.right, height: rect.height,
              width: rect.width, wrap: style.overflowWrap,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          }));
          const labelForFailure = width + 'px ' + dir + ' ' + font + 'px';
          for (const metric of metrics) {
            expect(metric.overflow, labelForFailure + ' document overflow').toBeLessThanOrEqual(1);
            expect(metric.left, labelForFailure + ' left').toBeGreaterThanOrEqual(-1);
            expect(metric.right, labelForFailure + ' right').toBeLessThanOrEqual(width + 1);
            expect(metric.height, labelForFailure + ' touch height').toBeGreaterThanOrEqual(43);
            expect(metric.wrap, labelForFailure + ' wrapping').toBe('anywhere');
          }
          expect(metrics[1].width, labelForFailure + ' download width').toBeGreaterThanOrEqual(43);
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-file-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await links.nth(1).focus();
    await expect(links.nth(1)).toBeFocused();
    expect(await links.nth(1).evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-file-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.nth(1).focus();
    expect(await links.nth(1).evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-file-390-rtl-200-forced-colors.png',
    });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-file-inline-css') ||
      document.getElementById('slateframe-core-file-css')
    ))).toBe(false);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Core File Gutenberg roundtrip preserves authored file options', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/file')?.attributes;
    if (!schema) throw new Error('Native Core File block is missing');
    const input = { href: '/wp-content/themes/slateframe/readme.txt',
      fileName: '日本語 中文 العربية.pdf', showDownloadButton: true,
      downloadButtonText: 'Download / 下载', displayPreview: false };
    const first = blocks.serialize(blocks.createBlock('core/file', input));
    const parsed = blocks.parse(first), second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid,
      attrs: {
        href: parsed[0]?.attributes.href,
        fileName: String(parsed[0]?.attributes.fileName ?? ''),
        showDownloadButton: parsed[0]?.attributes.showDownloadButton,
        downloadButtonText: String(parsed[0]?.attributes.downloadButtonText ?? ''),
        displayPreview: parsed[0]?.attributes.displayPreview,
      }, schema: Object.keys(schema) };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/file');
  expect(result.valid).toBe(true);
  expect(result.second).toBe(result.third);
  for (const key of ['href', 'fileName', 'showDownloadButton', 'downloadButtonText', 'displayPreview']) {
    expect(result.schema).toContain(key);
  }
  expect(result.attrs.href).toBe('/wp-content/themes/slateframe/readme.txt');
  expect(result.attrs.fileName).toBe('日本語 中文 العربية.pdf');
  expect(result.attrs.showDownloadButton).toBe(true);
  expect(result.attrs.downloadButtonText).toBe('Download / 下载');
  expect(result.attrs.displayPreview).toBe(false);
});
