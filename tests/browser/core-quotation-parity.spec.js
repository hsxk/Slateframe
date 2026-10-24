const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const multilingual = '日本語 中文 العربية ' + 'UnbrokenResearchReference'.repeat(9);
const fixture = '<!-- wp:group {"className":"slateframe-quotation-fixture"} --><div class="wp-block-group slateframe-quotation-fixture">' +
  '<!-- wp:quote --><blockquote class="wp-block-quote"><!-- wp:paragraph --><p><a href="#quotation-end">' + multilingual + '</a></p><!-- /wp:paragraph --><cite>Source: 日本語 中文 العربية</cite></blockquote><!-- /wp:quote -->' +
  '<!-- wp:pullquote --><figure class="wp-block-pullquote"><blockquote><p>' + multilingual + '</p><cite>Author — 日本語 中文 العربية</cite></blockquote></figure><!-- /wp:pullquote -->' +
  '<p id="quotation-end">End of quotation.</p></div><!-- /wp:group -->';

test('native Quote and Pullquote contain long multilingual citations in LTR, RTL and zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Single disposable WordPress fixture covers seven widths');
  const registered = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/editorial-pullquote')['content'];");
  expect(registered).toContain('<!-- wp:pullquote -->');
  expect(registered).toContain('<cite>');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe quotations ' + randomUUID(), '--post_content=' + fixture + registered, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-quotation-fixture');
    await expect(root.locator('.wp-block-quote')).toHaveCount(1);
    await expect(root.locator('.wp-block-pullquote')).toHaveCount(1);
    await expect(page.locator('.wp-block-pullquote')).toHaveCount(2);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, dir) => { node.dir = dir; node.style.fontSize = ''; }, direction);
        const geometry = await root.evaluate(node => {
          const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; };
          return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            quoteBorder: getComputedStyle(node.querySelector('.wp-block-quote')).borderInlineStartWidth,
            pullquoteAlign: getComputedStyle(node.querySelector('.wp-block-pullquote')).textAlign,
            elements: [...node.querySelectorAll('.wp-block-quote,.wp-block-pullquote,.wp-block-pullquote cite')].map(box) };
        });
        expect(geometry.overflow, width + 'px ' + direction + ' document overflow').toBeLessThanOrEqual(1);
        expect(geometry.quoteBorder).toBe('3px');
        expect(geometry.pullquoteAlign).toBe('start');
        for (const element of geometry.elements) {
          expect(element.width, width + 'px ' + direction + ' width').toBeGreaterThan(0);
          expect(element.left, width + 'px ' + direction + ' left').toBeGreaterThanOrEqual(-1);
          expect(element.right, width + 'px ' + direction + ' right').toBeLessThanOrEqual(width + 1);
        }
        if ([390, 1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await root.screenshot({ path: 'test-artifacts/screenshots/core-quotations-' + width + '-' + direction + '.png' });
          await page.locator('.wp-block-pullquote').last().screenshot({ path: 'test-artifacts/screenshots/editorial-pullquote-' + width + '-' + direction + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const link = root.locator('.wp-block-quote a');
    await page.evaluate(() => document.activeElement?.blur());
    let reachedByKeyboard = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      await page.keyboard.press('Tab');
      if (await link.evaluate(node => document.activeElement === node)) { reachedByKeyboard = true; break; }
    }
    expect(reachedByKeyboard, 'Quote link must be reachable by native Tab navigation').toBe(true);
    await expect(link).toBeFocused();
    await expect.poll(() => link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    const a11y = await new AxeBuilder({ page }).include('.slateframe-quotation-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-quotations-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '400%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Gutenberg preserves Core Quote and Pullquote serialized attributes without editing a post', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const editor = window.wp.data.select('core/block-editor');
    const blocks = window.wp.blocks;
    const before = blocks.serialize(editor.getBlocks());
    const cases = [
      blocks.createBlock('core/quote', { citation: 'A multilingual source' }, [
        blocks.createBlock('core/paragraph', { content: '日本語 中文 العربية' }),
      ]),
      blocks.createBlock('core/pullquote', { value: '日本語 中文 العربية', citation: 'A multilingual source' }),
    ].map(block => {
      const serialized = blocks.serialize(block);
      const parsed = blocks.parse(serialized);
      return { name: block.name, serialized, second: blocks.serialize(parsed),
        parsedName: parsed[0]?.name, valid: parsed[0]?.isValid, count: parsed.length,
        childNames: parsed[0]?.innerBlocks.map(child => child.name) };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.parsedName).toBe(entry.name);
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.serialized);
    expect(entry.serialized).toContain('日本語 中文 العربية');
    expect(entry.serialized).toContain('<cite>A multilingual source</cite>');
    if (entry.name === 'core/quote') {
      expect(entry.childNames).toEqual(['core/paragraph']);
      expect(entry.serialized).toContain('<!-- wp:paragraph -->');
    }
  }
});
