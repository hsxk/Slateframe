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
const words = '日本語 中文 العربية ' + 'LongUnbrokenReference'.repeat(10);
const fixture = '<!-- wp:group {"className":"slateframe-core-embed-fixture"} -->' +
  '<div class="wp-block-group slateframe-core-embed-fixture">' +
  '<!-- wp:embed {"type":"video","responsive":true} -->' +
  '<figure class="wp-block-embed is-type-video"><div class="wp-block-embed__wrapper">' +
  '<iframe src="about:blank" title="Offline Core Embed preview" width="960" height="540" tabindex="0"></iframe>' +
  '</div><figcaption class="wp-element-caption">' + words + '</figcaption></figure><!-- /wp:embed -->' +
  '<!-- wp:embed {"type":"rich","responsive":true} -->' +
  '<figure class="wp-block-embed is-type-rich"><div class="wp-block-embed__wrapper">' +
  '<a href="#embed-end">' + words + '</a></div>' +
  '<figcaption class="wp-element-caption">' + words + '</figcaption></figure><!-- /wp:embed -->' +
  '<p id="embed-end">End of embedded reference.</p></div><!-- /wp:group -->';

test('Core Embed bounds native iframe, fallback link and captions at seven widths', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers all widths');
  test.setTimeout(120000);
  const id = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=Core Embed parity ' + randomUUID(), '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?p=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-core-embed-fixture');
    await expect(root).toBeVisible();
    await expect(root.locator('.wp-block-embed')).toHaveCount(2);
    const frame = root.locator('iframe');
    await expect(frame).toHaveAttribute('src', 'about:blank');
    await expect(frame).toHaveAttribute('title', 'Offline Core Embed preview');
    await expect(root.locator('figcaption')).toHaveCount(2);
    // WordPress may inline a registered Core block stylesheet.
    await expect.poll(() => page.evaluate(() => {
      const inline = document.getElementById('slateframe-core-embed-inline-css');
      const external = document.getElementById('slateframe-core-embed-css');
      return Boolean(
        (inline && inline.textContent.includes('.wp-block-embed__wrapper')) ||
        (external && external.sheet)
      );
    })).toBe(true);

    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await setRootTextScale(page, 16, direction);
        const geometry = await root.evaluate(node => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          items: [...node.querySelectorAll('.wp-block-embed,.wp-block-embed__wrapper,iframe,figcaption,.wp-block-embed__wrapper a')].map(el => {
            const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect();
            const style = getComputedStyle(el);
            return { left: r.left, right: r.right, width: r.width, height: r.height,
              parentLeft: p.left, parentRight: p.right,
              wrap: style.overflowWrap, align: style.textAlign, tag: el.tagName.toLowerCase() };
          }),
        }));
        const label = width + 'px ' + direction;
        expect(geometry.overflow, label + ' page overflow').toBeLessThanOrEqual(1);
        expect(geometry.items).toHaveLength(8);
        for (const item of geometry.items) {
          expect(item.width, label + ' ' + item.tag + ' width').toBeGreaterThan(0);
          expect(item.left, label + ' ' + item.tag + ' left').toBeGreaterThanOrEqual(item.parentLeft - 1);
          expect(item.right, label + ' ' + item.tag + ' right').toBeLessThanOrEqual(item.parentRight + 1);
          if (item.tag === 'figcaption') {
            expect(item.wrap).toBe('anywhere');
            expect(item.align).toBe('start');
          }
          if (item.tag === 'a') {
            expect(item.height, label + ' fallback link 44px target').toBeGreaterThanOrEqual(43);
            expect(item.wrap, label + ' fallback link wrapping').toBe('anywhere');
          }
        }
        if ([320, 390, 1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await root.screenshot({
            path: 'test-artifacts/screenshots/core-embed-' + width + '-' + direction + '.png',
          });
        }
      }
    }

    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    const link = root.locator('.wp-block-embed__wrapper a');
    await page.evaluate(() => document.activeElement?.blur());
    let reached = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      if (await link.evaluate(node => document.activeElement === node)) {
        reached = true;
        break;
      }
    }
    expect(reached, 'Fallback link must be keyboard reachable').toBe(true);
    await expect(link).toBeFocused();
    await expect.poll(() => link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-core-embed-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await root.screenshot({
      path: 'test-artifacts/screenshots/core-embed-390-rtl-200-forced-colors.png',
    });
    await setRootTextScale(page, 64, 'rtl');
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(43);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'test-artifacts/screenshots/core-embed-390-rtl-400-forced-colors.png',
      fullPage: false,
    });
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() =>
      document.getElementById('slateframe-core-embed-inline-css') ||
      document.getElementById('slateframe-core-embed-css')
    )).toBeNull();
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Core Embed Gutenberg parse/serialize leaves the editor post unchanged', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    if (!blocks.getBlockType('core/embed')) throw new Error('Native Core Embed is missing');
    const before = blocks.serialize(editor.getBlocks());
    const cases = ['video', 'rich'].map(type => {
      const block = blocks.createBlock('core/embed', {
        url: 'https://example.invalid/offline-reference',
        type, responsive: true, caption: '日本語 中文 العربية',
      });
      const first = blocks.serialize(block);
      const parsed = blocks.parse(first);
      return { first, second: blocks.serialize(parsed),
        valid: parsed[0]?.isValid, name: parsed[0]?.name, count: parsed.length };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.name).toBe('core/embed');
    expect(entry.count).toBe(1);
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.first);
    expect(entry.first).toContain('日本語 中文 العربية');
  }
});
