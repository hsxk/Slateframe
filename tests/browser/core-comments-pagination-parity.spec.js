const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('Core Comments Pagination preserves navigation, targets, 44px controls and reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress page covers seven widths');
  test.setTimeout(150000);
  const content = '<!-- wp:group {"className":"slateframe-comments-pagination-fixture"} -->' +
    '<div class="wp-block-group slateframe-comments-pagination-fixture">' +
    '<p id="slateframe-comments-start">Older comments target</p>' +
    '<!-- wp:comments-pagination -->' +
    '<a class="wp-block-comments-pagination-previous" href="#slateframe-comments-start">Older 日本語 中文 العربية</a>' +
    '<div class="wp-block-comments-pagination-numbers">' +
    '<a class="page-numbers" href="#slateframe-comments-start">1</a>' +
    '<span class="page-numbers current" aria-current="page">2</span>' +
    '<a class="page-numbers" href="#slateframe-comments-end">3</a></div>' +
    '<a class="wp-block-comments-pagination-next" href="#slateframe-comments-end">Newer 日本語 中文 العربية</a>' +
    '<!-- /wp:comments-pagination -->' +
    '<p id="slateframe-comments-end">Newer comments target</p>' +
    '</div><!-- /wp:group -->';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Comments Pagination presentation fixture', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-comments-pagination-fixture');
    const nav = root.locator('nav.wp-block-comments-pagination');
    await expect(nav).toHaveCount(1);
    expect((await nav.getAttribute('aria-label'))?.trim().length).toBeGreaterThan(0);
    const links = nav.locator('a');
    await expect(links).toHaveCount(4);
    await expect(nav.locator('[aria-current="page"]')).toHaveText('2');
    await expect(nav.locator('[aria-current="page"] a')).toHaveCount(0);
    expect(await links.evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))).toEqual([
      '#slateframe-comments-start', '#slateframe-comments-start',
      '#slateframe-comments-end', '#slateframe-comments-end',
    ]);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-comments-pagination-inline-css') ||
      document.getElementById('slateframe-core-comments-pagination-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir; node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const m = await nav.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            targets: [...node.querySelectorAll('a,.page-numbers.current')].map(el => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(el).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(m.overflow, label + ' page overflow').toBeLessThanOrEqual(1);
          for (const target of m.targets) {
            expect(target.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(target.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(target.width, label + ' width').toBeGreaterThanOrEqual(43);
            expect(target.height, label + ' height').toBeGreaterThanOrEqual(43);
            expect(target.wrap, label + ' wrapping').toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await nav.screenshot({ path: 'test-artifacts/screenshots/core-comments-pagination-' +
              width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(await links.first().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-comments-pagination-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await nav.screenshot({ path: 'test-artifacts/screenshots/core-comments-pagination-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    // Printed discussions keep their content, not dead pagination controls.
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    await expect(nav).toBeHidden();
    await expect(root.locator('#slateframe-comments-start')).toBeVisible();
    await page.screenshot({
      path: 'test-artifacts/screenshots/core-comments-pagination-print-390-rtl-400.png',
      animations: 'disabled',
    });
    await page.emulateMedia({ media: 'screen', forcedColors: 'none' });
    await expect(nav).toBeVisible();
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-comments-pagination-inline-css') ||
      document.getElementById('slateframe-core-comments-pagination-css'))).toBeNull();
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Core Comments Pagination Gutenberg child blocks survive serialization', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const names = ['core/comments-pagination-previous', 'core/comments-pagination-numbers',
      'core/comments-pagination-next'];
    const children = names.map(name => blocks.createBlock(name));
    const block = blocks.createBlock('core/comments-pagination', { paginationArrow: 'arrow' }, children);
    const first = blocks.serialize([block]);
    const parsed = blocks.parse(first);
    return { registered: Boolean(blocks.getBlockType('core/comments-pagination')),
      first, second: blocks.serialize(parsed), count: parsed.length, name: parsed[0]?.name,
      arrow: parsed[0]?.attributes.paginationArrow,
      children: parsed[0]?.innerBlocks.map(child => child.name) };
  });
  expect(result.registered).toBe(true);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/comments-pagination');
  expect(result.arrow).toBe('arrow');
  expect(result.children).toEqual(['core/comments-pagination-previous',
    'core/comments-pagination-numbers', 'core/comments-pagination-next']);
  expect(result.first).toBe(result.second);
});
