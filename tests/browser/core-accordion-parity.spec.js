const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const longTitle = '日本語 中文 العربية ' + 'LongUnbrokenAccordionHeading'.repeat(3);
const heading = title => '<!-- wp:accordion-heading -->' +
  '<h3 class="wp-block-accordion-heading has-icon has-icon-right">' +
  '<button type="button" class="wp-block-accordion-heading__toggle">' +
  '<span class="wp-block-accordion-heading__toggle-title">' + title + '</span>' +
  '<span class="wp-block-accordion-heading__toggle-icon" aria-hidden="true">+</span>' +
  '</button></h3><!-- /wp:accordion-heading -->';
const item = (title, body) => '<!-- wp:accordion-item -->' +
  '<div class="wp-block-accordion-item">' + heading(title) +
  '<!-- wp:accordion-panel --><div role="region" class="wp-block-accordion-panel">' +
  '<!-- wp:paragraph --><p>' + body + '</p><!-- /wp:paragraph -->' +
  '</div><!-- /wp:accordion-panel --></div><!-- /wp:accordion-item -->';
const content = '<!-- wp:group {"className":"slateframe-core-accordion-fixture"} -->' +
  '<div class="wp-block-group slateframe-core-accordion-fixture">' +
  '<!-- wp:accordion --><div role="group" class="wp-block-accordion">' +
  item(longTitle, 'First native panel / 第一部分') +
  item('Second / 次へ / التالي', 'Second native panel / 第二部分') +
  '</div><!-- /wp:accordion --></div><!-- /wp:group -->';

test('native Core Accordion reflow, interactions, forced-colors and print', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture tests seven widths');
  test.setTimeout(180000);
  expect(wp('eval', 'echo WP_Block_Type_Registry::get_instance()->is_registered("core/accordion") ? "yes" : "no";')).toBe('yes');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Accordion presentation', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const accordion = page.locator('.slateframe-core-accordion-fixture .wp-block-accordion').first();
    await expect(accordion).toBeVisible();
    const scopedStyle = page.locator('style#slateframe-core-accordion-inline-css, link#slateframe-core-accordion-css');
    await expect(scopedStyle).toHaveCount(1);
    const toggles = accordion.locator('.wp-block-accordion-heading__toggle');
    const panels = accordion.locator('.wp-block-accordion-panel');
    await expect(toggles).toHaveCount(2);
    await expect(panels).toHaveCount(2);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir;
            node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const metrics = await accordion.evaluate(node => ({
            rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
            viewport: document.documentElement.clientWidth,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            buttons: [...node.querySelectorAll('.wp-block-accordion-heading__toggle')].map(button => {
              const rect = button.getBoundingClientRect();
              return { left: rect.left, right: rect.right, width: rect.width, height: rect.height,
                wrap: getComputedStyle(button).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.rootFont, label).toBeCloseTo(font, 1);
          expect(metrics.overflow, label).toBeLessThanOrEqual(1);
          for (const button of metrics.buttons) {
            expect(button.width, label).toBeGreaterThanOrEqual(44);
            expect(button.height, label).toBeGreaterThanOrEqual(44);
            expect(button.left, label).toBeGreaterThanOrEqual(-1);
            expect(button.right, label).toBeLessThanOrEqual(metrics.viewport + 1);
            expect(button.wrap, label).toBe('anywhere');
          }
          if (width === 390 && font === 64) {
            await toggles.first().scrollIntoViewIfNeeded();
            await page.screenshot({ path: 'test-artifacts/screenshots/core-accordion-390-' + dir + '-400.png',
              animations: 'disabled' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = '32px'; });
    await toggles.first().click();
    await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true');
    await expect(panels.first()).toBeVisible();
    await toggles.first().click();
    await expect(toggles.first()).toHaveAttribute('aria-expanded', 'false');
    await expect(panels.first()).toBeHidden();
    await toggles.first().focus();
    await page.keyboard.press('Enter');
    await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true');
    const axe = await new AxeBuilder({ page }).include('.slateframe-core-accordion-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await toggles.first().click();
    await expect(panels.first()).toBeHidden();
    await page.emulateMedia({ forcedColors: 'active' });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '64px'; });
    await toggles.first().focus();
    expect(await toggles.first().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await toggles.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/core-accordion-390-rtl-400-forced-colors.png',
      animations: 'disabled' });
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    await expect(panels.first()).toBeVisible();
    await expect(panels.nth(1)).toBeVisible();
    const print = await panels.first().evaluate(node => ({
      height: node.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(print.height).toBeGreaterThan(0);
    expect(print.overflow).toBeLessThanOrEqual(1);
    await panels.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/core-accordion-print-390-rtl-400.png',
      animations: 'disabled' });
    await page.emulateMedia({ media: 'screen' });
    await expect(panels.first()).toBeHidden();
    await expect(toggles.first()).toHaveAttribute('aria-expanded', 'false');
    await page.goto('/?p=999999', { waitUntil: 'networkidle' });
    await expect(page.locator('style#slateframe-core-accordion-inline-css, link#slateframe-core-accordion-css')).toHaveCount(0);
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Core Accordion Gutenberg serialization is native and editor content remains untouched', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const created = blocks.createBlock('core/accordion', {}, [
      blocks.createBlock('core/accordion-item', {}, [
        blocks.createBlock('core/accordion-heading', { title: '日本語 中文 العربية' }),
        blocks.createBlock('core/accordion-panel', {}, [
          blocks.createBlock('core/paragraph', { content: 'Native panel / 第一部分' }),
        ]),
      ]),
    ]);
    const serialized = blocks.serialize(created);
    const parsed = blocks.parse(serialized);
    return { before, after: blocks.serialize(editor.getBlocks()), serialized,
      roundtrip: blocks.serialize(parsed), valid: parsed[0]?.isValid,
      names: [parsed[0]?.name, parsed[0]?.innerBlocks[0]?.name,
        parsed[0]?.innerBlocks[0]?.innerBlocks[0]?.name,
        parsed[0]?.innerBlocks[0]?.innerBlocks[1]?.name] };
  });
  expect(result.after).toBe(result.before);
  expect(result.valid).toBe(true);
  expect(result.names).toEqual(['core/accordion', 'core/accordion-item',
    'core/accordion-heading', 'core/accordion-panel']);
  expect(result.roundtrip).toBe(result.serialized);
  expect(result.serialized).toContain('日本語 中文 العربية');
});
