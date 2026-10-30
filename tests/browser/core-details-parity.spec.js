const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const { setRootTextScale } = require('./support/root-text-scale');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Details disclosure keeps keyboard behavior and multilingual reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress post checks seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-details-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:details {"className":"is-style-slateframe-disclosure slateframe-details-fixture"} -->' +
    '<details class="wp-block-details is-style-slateframe-disclosure slateframe-details-fixture"><summary>日本語 中文 العربية VeryLongUnbrokenEditorialDisclosureTokenRepeatedManyTimesVeryLongUnbrokenEditorialDisclosureTokenRepeatedManyTimes</summary>' +
    '<!-- wp:paragraph --><p>Core disclosure content stays readable in every writing direction.</p><!-- /wp:paragraph -->' +
    '<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#slateframe-details-target">Read the following section</a></div><!-- /wp:button --></div><!-- /wp:buttons -->' +
    '</details><!-- /wp:details -->' +
    '<!-- wp:details {"align":"wide","className":"slateframe-details-wide"} --><details class="wp-block-details alignwide slateframe-details-wide"><summary>Wide disclosure stays authored</summary></details><!-- /wp:details -->' +
    '<!-- wp:details {"align":"full","className":"slateframe-details-full"} --><details class="wp-block-details alignfull slateframe-details-full"><summary>Full disclosure stays authored</summary></details><!-- /wp:details -->' +
    '<!-- wp:paragraph --><p id="slateframe-details-target">Following section remains outside the disclosure.</p><!-- /wp:paragraph -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-details-fixture');
    const summary = root.locator(':scope > summary');
    const link = root.locator('a.wp-block-button__link');
    await expect(summary).toContainText('日本語 中文 العربية');
    await expect(page.locator('.slateframe-details-wide')).toHaveClass(/alignwide/);
    await expect(page.locator('.slateframe-details-full')).toHaveClass(/alignfull/);
    await expect(root).not.toHaveAttribute('open');
    await summary.focus();
    await expect(summary).toBeFocused();
    await summary.press('Enter');
    await expect(root).toHaveAttribute('open', '');
    await expect(link).toBeVisible();
    await summary.press('Space');
    await expect(root).not.toHaveAttribute('open');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-details-inline-css') ||
      document.getElementById('slateframe-core-details-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          await root.evaluate(node => { node.open = true; });
          const state = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            root: node.getBoundingClientRect().toJSON(),
            summary: node.querySelector('summary').getBoundingClientRect().toJSON(),
            summaryDisplay: getComputedStyle(node.querySelector('summary')).display,
            min: getComputedStyle(node.querySelector('summary')).minBlockSize,
            wrap: getComputedStyle(node).overflowWrap,
            inlinePadding: parseFloat(getComputedStyle(node).paddingInlineStart)
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' horizontal document overflow').toBeLessThanOrEqual(1);
          for (const box of [state.root, state.summary]) {
            expect(box.left, label + ' left bound').toBeGreaterThanOrEqual(-1);
            expect(box.right, label + ' right bound').toBeLessThanOrEqual(width + 1);
          }
          expect(state.summary.height, label + ' summary target').toBeGreaterThanOrEqual(43);
          expect(state.summaryDisplay, label + ' native disclosure marker').toBe('list-item');
          expect(state.wrap).toBe('anywhere');
          const nativePadding = Math.max(font * .9, Math.min(width * .02, font * 1.25));
          expect(state.inlinePadding, label + ' bounded disclosure inset')
            .toBeCloseTo(Math.min(nativePadding, 24), 1);
          const target = await link.boundingBox();
          expect(target.width, label + ' nested link width').toBeGreaterThanOrEqual(43);
          expect(target.height, label + ' nested link height').toBeGreaterThanOrEqual(43);
          if (font === 16) {
            await page.screenshot({ fullPage: true,
              path: 'test-artifacts/screenshots/core-details-parity-' + width + '-' + dir + '.png' });
          }
          if (width === 390 && font === 64) {
            await summary.scrollIntoViewIfNeeded();
            await page.screenshot({ fullPage: false,
              path: 'test-artifacts/screenshots/core-details-390-' + dir + '-400.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await summary.focus();
    await expect(summary).toBeFocused();
    expect(await summary.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-details-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-details-parity-390-rtl-200-forced-colors.png' });
    await setRootTextScale(page, 64, 'rtl');
    await summary.focus();
    await summary.scrollIntoViewIfNeeded();
    await page.screenshot({ fullPage: false,
      path: 'test-artifacts/screenshots/core-details-390-rtl-400-forced-colors.png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-details-inline-css') ||
      document.getElementById('slateframe-core-details-css')
    ))).toBe(false);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});

test('native Details Gutenberg roundtrip preserves summary and nested Core blocks', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const root = blocks.createBlock('core/details', { summary: '日本語 中文 العربية', align: 'wide', name: 'slateframe-faq' }, [
      blocks.createBlock('core/paragraph', { content: 'Native details body' })
    ]);
    const first = blocks.serialize(root);
    const parsed = blocks.parse(first);
    const second = blocks.serialize(parsed);
    return { before, after: blocks.serialize(editor.getBlocks()), first, second,
      third: blocks.serialize(blocks.parse(second)), count: parsed.length,
      name: parsed[0]?.name, valid: parsed[0]?.isValid,
      summary: String(parsed[0]?.attributes.summary ?? ''),
      align: parsed[0]?.attributes.align,
      groupName: parsed[0]?.attributes.name,
      inner: parsed[0]?.innerBlocks.map(block => block.name) };
  });
  expect(result.after).toBe(result.before);
  expect(result.count).toBe(1);
  expect(result.name).toBe('core/details');
  expect(result.valid).toBe(true);
  expect(result.summary).toBe('日本語 中文 العربية');
  expect(result.align).toBe('wide');
  expect(result.groupName).toBe('slateframe-faq');
  expect(result.inner).toEqual(['core/paragraph']);
  expect(result.first).toBe(result.second);
  expect(result.second).toBe(result.third);
});
