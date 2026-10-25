const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('Core Post Excerpt preserves Read More permalink and seven-width reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable post covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-excerpt-' + randomUUID().slice(0, 12);
  const excerpt = '日本語 中文 العربية ' + 'LongUnbrokenExcerpt'.repeat(9);
  const content = '<!-- wp:group {"className":"slateframe-post-excerpt-fixture"} -->' +
    '<div class="wp-block-group slateframe-post-excerpt-fixture">' +
    '<!-- wp:post-excerpt {"moreText":"Read full story","showMoreOnNewLine":true} /-->' +
    '<!-- wp:post-excerpt {"moreText":"Continue reading","showMoreOnNewLine":false} /-->' +
    '<!-- wp:post-excerpt {"moreText":""} /-->' +
    '</div><!-- /wp:group -->';
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=' + slug, '--post_excerpt=' + excerpt, '--post_content=' + content, '--porcelain');
  try {
    const permalink = wp('eval', 'echo get_permalink(' + Number(postId) + ');');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-post-excerpt-fixture');
    await expect(root).toBeVisible();
    const blocks = root.locator('.wp-block-post-excerpt');
    await expect(blocks).toHaveCount(3);
    await expect(blocks.locator('.wp-block-post-excerpt__excerpt')).toHaveCount(3);
    const links = root.locator('a.wp-block-post-excerpt__more-link');
    await expect(links).toHaveCount(2);
    await expect(links.first()).toHaveText('Read full story');
    await expect(links.last()).toHaveText('Continue reading');
    for (const href of await links.evaluateAll(nodes => nodes.map(el => el.href))) expect(href).toBe(permalink);
    await expect(blocks.last().locator('a')).toHaveCount(0);
    expect(await blocks.first().innerText()).toContain('日本語');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-excerpt-inline-css') ||
      document.getElementById('slateframe-core-post-excerpt-css')
    ))).toBe(true);
    await links.first().evaluate(el => { el.textContent = '日本語 中文 العربية ' + 'LongUnbrokenReadMore'.repeat(8); });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            links: [...node.querySelectorAll('.wp-block-post-excerpt__more-link')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.links).toHaveLength(2);
          for (const link of state.links) {
            expect(link.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(link.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(link.width, label + ' target width').toBeGreaterThanOrEqual(43);
            expect(link.height, label + ' target height').toBeGreaterThanOrEqual(43);
            expect(link.wrap, label + ' CJK wrapping').toBe('anywhere');
          }
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-post-excerpt-' + width + '-' + dir + '.png'
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-post-excerpt-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.first().focus();
    expect(await links.first().evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-post-excerpt-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await links.first().click();
    await expect.poll(() => page.url()).toBe(permalink);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-post-excerpt-inline-css') ||
      document.getElementById('slateframe-core-post-excerpt-css'))).toBeNull();
  } finally {
    wp('post', 'delete', postId, '--force');
  }
});

test('Core Post Excerpt Gutenberg roundtrip retains native More options', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-excerpt')?.attributes;
    if (!schema) throw new Error('Native Core Post Excerpt schema missing');
    const cases = [
      { moreText: 'Read full story', showMoreOnNewLine: true, excerptLength: 18 },
      { moreText: 'Continue reading', showMoreOnNewLine: false, excerptLength: 25 },
      { moreText: '' },
    ].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/post-excerpt', input));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { input, first, second, third: blocks.serialize(reparsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes,
        reparsedAttrs: reparsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases, supported: Object.keys(schema) };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/post-excerpt');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    for (const key of ['moreText', 'showMoreOnNewLine', 'excerptLength']) {
      if (result.supported.includes(key) && Object.prototype.hasOwnProperty.call(entry.input, key)) {
        expect(entry.attrs[key]).toBe(entry.input[key]);
      }
    }
  }
});
