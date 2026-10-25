const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Group preserves nested multilingual content and authored alignments', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress post checks seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-group-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:group {"className":"slateframe-group-fixture"} --><div class="wp-block-group slateframe-group-fixture">' +
    '<!-- wp:group {"className":"slateframe-group-nested"} --><div class="wp-block-group slateframe-group-nested">' +
    '<!-- wp:paragraph --><p>日本語 中文 العربية LongUnbrokenEditorialReference'.repeat(1) +
    'VeryLongUnbrokenEditorialReferenceRepeatedManyTimesVeryLongUnbrokenEditorialReferenceRepeatedManyTimes</p><!-- /wp:paragraph -->' +
    '<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#slateframe-group-target">Read the following section</a></div><!-- /wp:button --></div><!-- /wp:buttons -->' +
    '</div><!-- /wp:group -->' +
    '<!-- wp:paragraph --><p id="slateframe-group-target">The next section retains Core markup.</p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:group -->' +
    '<!-- wp:group {"align":"wide","className":"slateframe-group-wide"} --><div class="wp-block-group alignwide slateframe-group-wide"><p>Wide layout stays authored</p></div><!-- /wp:group -->' +
    '<!-- wp:group {"align":"full","className":"slateframe-group-full"} --><div class="wp-block-group alignfull slateframe-group-full"><p>Full layout stays authored</p></div><!-- /wp:group -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-group-fixture');
    const nested = root.locator('.slateframe-group-nested');
    const link = nested.locator('a.wp-block-button__link');
    await expect(nested).toContainText('日本語 中文 العربية');
    await expect(link).toHaveAttribute('href', '#slateframe-group-target');
    await expect(page.locator('.slateframe-group-wide')).toHaveClass(/alignwide/);
    await expect(page.locator('.slateframe-group-full')).toHaveClass(/alignfull/);
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-group-inline-css') ||
      document.getElementById('slateframe-core-group-css')
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
            const rect = element => element.getBoundingClientRect().toJSON();
            const nested = node.querySelector('.slateframe-group-nested');
            return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              outer: rect(node), inner: rect(nested), outerStyle: getComputedStyle(node).overflowWrap,
              innerStyle: getComputedStyle(nested).overflowWrap,
              min: getComputedStyle(nested).minInlineSize };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' page overflow').toBeLessThanOrEqual(1);
          for (const box of [state.outer, state.inner]) {
            expect(box.left, label + ' left bound').toBeGreaterThanOrEqual(-1);
            expect(box.right, label + ' right bound').toBeLessThanOrEqual(width + 1);
          }
          expect(state.outerStyle).toBe('anywhere');
          expect(state.innerStyle).toBe('anywhere');
          expect(state.min).toBe('0px');
          const target = await link.boundingBox();
          expect(target.width, label + ' button width').toBeGreaterThanOrEqual(43);
          expect(target.height, label + ' button height').toBeGreaterThanOrEqual(43);
          if (font === 16) await page.screenshot({ fullPage: true,
            path: 'test-artifacts/screenshots/core-group-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-group-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-group-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Group Gutenberg roundtrip keeps nested Core blocks and editor content', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const root = blocks.createBlock('core/group', { className: 'slateframe-group-editor' }, [
      blocks.createBlock('core/group', {}, [
        blocks.createBlock('core/paragraph', { content: '日本語 中文 العربية' })
      ])
    ]);
    const first = blocks.serialize(root);
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid,
      className: parsed[0]?.attributes.className,
      inner: parsed[0]?.innerBlocks.map(block => block.name) };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/group');
  expect(result.valid).toBe(true);
  expect(result.className).toBe('slateframe-group-editor');
  expect(result.inner).toEqual(['core/group']);
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
});
