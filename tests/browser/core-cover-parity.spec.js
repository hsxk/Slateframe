const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const src = '/wp-content/themes/slateframe/assets/images/pattern-placeholder-landscape.svg';
const words = '日本語 中文 العربية ' + 'LongUnbrokenKnowledgeReference'.repeat(8);
const fixture = '<!-- wp:group {"className":"slateframe-cover-fixture"} --><div class="wp-block-group slateframe-cover-fixture">' +
  '<!-- wp:cover {"dimRatio":100,"customOverlayColor":"#e5ece8","minHeight":320,"minHeightUnit":"px","isDark":false} -->' +
  '<div class="wp-block-cover is-light slateframe-cover-text-fixture" style="min-height:320px"><span aria-hidden="true" class="wp-block-cover__background has-background-dim-100 has-background-dim" style="background-color:#e5ece8"></span>' +
  '<div class="wp-block-cover__inner-container"><!-- wp:heading --><h2 class="wp-block-heading">日本語 中文 العربية</h2><!-- /wp:heading -->' +
  '<!-- wp:paragraph --><p><a href="#cover-end">' + words + '</a></p><!-- /wp:paragraph --></div></div><!-- /wp:cover -->' +
  '<!-- wp:cover {"url":"' + src + '","dimRatio":50,"minHeight":240,"minHeightUnit":"px"} -->' +
  '<div class="wp-block-cover slateframe-cover-media-fixture" style="min-height:240px"><span aria-hidden="true" class="wp-block-cover__background has-background-dim"></span>' +
  '<img class="wp-block-cover__image-background" alt="" src="' + src + '" data-object-fit="cover" style="object-position:80% 30%" />' +
  '<div class="wp-block-cover__inner-container"><p>Native Cover media</p></div></div><!-- /wp:cover -->' +
  '<p id="cover-end">End of reference.</p></div><!-- /wp:group -->';

test('native Core Cover bounds multilingual text and decorative media in LTR/RTL', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress fixture checks seven viewport widths');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe Cover ' + randomUUID(), '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-cover-fixture');
    const covers = root.locator('.wp-block-cover');
    await expect(covers).toHaveCount(2);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, value) => { node.dir = value; node.style.fontSize = ''; }, dir);
        const data = await root.evaluate(node => {
          const rect = el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height }; };
          return {
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            covers: [...node.querySelectorAll('.wp-block-cover')].map(cover => {
              const inner = cover.querySelector('.wp-block-cover__inner-container');
              const media = cover.querySelector('.wp-block-cover__image-background');
              return { box: rect(cover), inner: rect(inner), min: getComputedStyle(inner).minInlineSize,
                wrap: getComputedStyle(inner).overflowWrap, media: media ? rect(media) : null,
                objectPosition: media ? getComputedStyle(media).objectPosition : null };
            }),
          };
        });
        expect(data.overflow, width + ' ' + dir + ' page overflow').toBeLessThanOrEqual(1);
        for (const cover of data.covers) {
          expect(cover.min).toBe('0px');
          expect(cover.wrap).toBe('anywhere');
          expect(cover.inner.width).toBeGreaterThan(0);
          expect(cover.inner.left).toBeGreaterThanOrEqual(cover.box.left - 1);
          expect(cover.inner.right).toBeLessThanOrEqual(cover.box.right + 1);
        }
        expect(data.covers[0].box.height).toBeGreaterThanOrEqual(319);
        expect(data.covers[1].media.width).toBeGreaterThan(0);
        expect(data.covers[1].objectPosition).toBe('80% 30%');
        if ([390, 1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await root.screenshot({ path: 'test-artifacts/screenshots/core-cover-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const link = root.locator('.slateframe-cover-text-fixture a');
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    await expect.poll(() => link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-cover-text-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-cover-390-rtl-200-forced-colors.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Gutenberg Core Cover serializes native attributes without modifying the editor post', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const editor = window.wp.data.select('core/block-editor');
    const blocks = window.wp.blocks;
    const before = blocks.serialize(editor.getBlocks());
    if (!blocks.getBlockType('core/cover')) throw new Error('Core Cover not registered');
    const created = blocks.createBlock('core/cover', {
      dimRatio: 50, minHeight: 320, minHeightUnit: 'px', contentPosition: 'center center',
      url: '/wp-content/themes/slateframe/assets/images/pattern-placeholder-landscape.svg',
    }, [blocks.createBlock('core/paragraph', { content: '日本語 中文 العربية' })]);
    const serialized = blocks.serialize(created);
    const parsed = blocks.parse(serialized);
    return { before, after: blocks.serialize(editor.getBlocks()), serialized,
      count: parsed.length, name: parsed[0]?.name, valid: parsed[0]?.isValid,
      second: blocks.serialize(parsed), attrs: parsed[0]?.attributes };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/cover');
  expect(result.valid).toBe(true);
  expect(result.second).toBe(result.serialized);
  expect(result.attrs.minHeight).toBe(320);
  expect(result.attrs.dimRatio).toBe(50);
  expect(result.serialized).toContain('日本語 中文 العربية');
});
