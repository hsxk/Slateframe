const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core Previous/Next Post links retain native neighbors and 44px reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable three-post fixture covers seven widths');
  test.setTimeout(150000);
  const suffix = randomUUID().slice(0, 12);
  const titles = ['Older 日本語 ' + suffix, 'Current 中文 ' + suffix, 'Newer العربية ' + suffix];
  const content = '<!-- wp:group {"className":"slateframe-post-navigation-fixture"} -->' +
    '<div class="wp-block-group slateframe-post-navigation-fixture">' +
    '<!-- wp:post-navigation-link {"type":"previous","showTitle":true} /-->' +
    '<!-- wp:post-navigation-link {"type":"next","showTitle":true} /-->' +
    '</div><!-- /wp:group -->';
  const ids = [];
  try {
    for (let i = 0; i < 3; i++) {
      ids.push(wp('post', 'create', '--post_type=post', '--post_status=publish',
        '--post_date=1999-01-0' + (i + 1) + ' 12:00:00',
        '--post_title=' + titles[i], '--post_content=' + (i === 1 ? content : 'Adjacent post fixture'),
        '--porcelain'));
    }
    const olderUrl = wp('eval', 'echo get_permalink(' + Number(ids[0]) + ');');
    const newerUrl = wp('eval', 'echo get_permalink(' + Number(ids[2]) + ');');
    await page.goto('/?p=' + ids[1], { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-post-navigation-fixture');
    await expect(root).toBeVisible();
    const previous = root.locator('.post-navigation-link-previous a');
    const next = root.locator('.post-navigation-link-next a');
    await expect(previous).toHaveAttribute('href', olderUrl);
    await expect(next).toHaveAttribute('href', newerUrl);
    await expect(previous).toContainText(titles[0]);
    await expect(next).toContainText(titles[2]);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-navigation-inline-css') ||
      document.getElementById('slateframe-core-post-navigation-css')
    ))).toBe(true);
    // Only change the visible DOM for long-label stress; preserve Core links.
    await root.locator('a').evaluateAll(nodes => nodes.forEach((node, index) => {
      node.textContent = (index ? 'Next' : 'Previous') + ' 日本語 中文 العربية ' +
        'UnbrokenNavigationLabel'.repeat(6);
    }));
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((el, state) => {
            el.dir = state.dir; el.style.fontSize = state.font + 'px';
          }, { dir, font });
          for (const link of [previous, next]) {
            const box = await link.evaluate(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap,
                overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
            });
            const label = width + 'px ' + dir + ' ' + font + 'px';
            expect(box.overflow, label + ' page overflow').toBeLessThanOrEqual(1);
            expect(box.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(box.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(box.width, label + ' target width').toBeGreaterThanOrEqual(43);
            expect(box.height, label + ' target height').toBeGreaterThanOrEqual(43);
            expect(box.wrap, label + ' CJK wrapping').toBe('anywhere');
          }
          if (font === 16) await root.screenshot({
            path: 'test-artifacts/screenshots/core-post-navigation-' + width + '-' + dir + '.png',
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(el => { el.dir = 'rtl'; el.style.fontSize = '32px'; });
    await previous.focus();
    await expect(previous).toBeFocused();
    expect(await previous.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-post-navigation-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await previous.focus();
    expect(await previous.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-post-navigation-390-rtl-200-forced-colors.png',
    });
    await page.locator('html').evaluate(el => { el.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await previous.click();
    await expect.poll(() => page.url()).toBe(olderUrl);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-post-navigation-inline-css') ||
      document.getElementById('slateframe-core-post-navigation-css'))).toBeNull();
  } finally {
    for (const id of ids.reverse()) wp('post', 'delete', id, '--force');
  }
});

test('Core Post Navigation Gutenberg roundtrip keeps native direction and label options', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-navigation-link')?.attributes;
    if (!schema) throw new Error('Native Core Post Navigation Link schema missing');
    const cases = [
      { type: 'previous', showTitle: true },
      { type: 'next', showTitle: false, label: 'Next 日本語 中文 العربية' },
    ].map(input => {
      const first = blocks.serialize(blocks.createBlock('core/post-navigation-link', input));
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
    expect(entry.name).toBe('core/post-navigation-link');
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    for (const key of Object.keys(entry.input)) {
      if (result.supported.includes(key)) expect(entry.attrs[key]).toBe(entry.input[key]);
    }
  }
});
