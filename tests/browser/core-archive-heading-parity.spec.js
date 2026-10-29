const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const long = 'LongUnbrokenArchiveHeading'.repeat(10);
const content = [
  '<!-- wp:query-title {"type":"archive"} /-->',
  '<!-- wp:term-description /-->',
  '<!-- wp:html -->',
  '<section class="slateframe-archive-heading-fixture">',
  '<h2 class="wp-block-query-title">日本語 中文 العربية ' + long + '</h2>',
  '<div class="wp-block-term-description"><p>Source and context — 日本語 中文 العربية ' + long + '</p></div>',
  '</section>',
  '<!-- /wp:html -->'
].join('');

test('native archive block styles bound multilingual headings at seven widths and 400% zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers all widths');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Archive presentation ' + randomUUID(), '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-archive-heading-fixture');
    const title = root.locator('.wp-block-query-title');
    const description = root.locator('.wp-block-term-description');
    await expect(root).toBeVisible();
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const size of [16, 32, 64]) {
          await page.locator('html').evaluate((node, settings) => {
            node.dir = settings.dir;
            node.style.fontSize = settings.size + 'px';
          }, { dir, size });
          const geometry = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            fragments: [...node.querySelectorAll('h2,p')].flatMap(el => {
              const range = document.createRange();
              range.selectNodeContents(el);
              return [...range.getClientRects()].map(rect => ({
                left: rect.left, right: rect.right
              }));
            }),
            styles: [...node.querySelectorAll('.wp-block-query-title,.wp-block-term-description')].map(
              el => getComputedStyle(el).overflowWrap
            )
          }));
          expect(geometry.overflow, width + ' ' + dir + ' ' + size).toBeLessThanOrEqual(1);
          expect(geometry.styles).toEqual(['anywhere', 'anywhere']);
          for (const rect of geometry.fragments) {
            expect(rect.left, width + ' ' + dir + ' ' + size).toBeGreaterThanOrEqual(-1);
            expect(rect.right, width + ' ' + dir + ' ' + size).toBeLessThanOrEqual(width + 1);
          }
        }
        if ([390, 1440].includes(width)) {
          await page.locator('html').evaluate(node => { node.style.fontSize = '32px'; });
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await root.screenshot({
            path: 'test-artifacts/screenshots/core-archive-heading-' + width + '-' + dir + '-200.png'
          });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '64px'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page }).include('.slateframe-archive-heading-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await title.screenshot({
      path: 'test-artifacts/screenshots/core-archive-heading-390-rtl-400-forced-colors.png'
    });
    await description.screenshot({
      path: 'test-artifacts/screenshots/core-term-description-390-rtl-400-forced-colors.png'
    });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Gutenberg Core Query Title and Term Description serialize without changing editor post', async ({ page }, info) => {
  const id = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!id || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated editor fixture');
  await openAuthenticatedEditor(page, id);
  const result = await page.evaluate(() => {
    const editor = window.wp.data.select('core/block-editor');
    const blocks = window.wp.blocks;
    const before = blocks.serialize(editor.getBlocks());
    const cases = [
      blocks.createBlock('core/query-title', { type: 'archive' }),
      blocks.createBlock('core/term-description')
    ].map(block => {
      const first = blocks.serialize(block);
      const parsed = blocks.parse(first);
      return { first, second: blocks.serialize(parsed), name: parsed[0]?.name, valid: parsed[0]?.isValid };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  expect(result.cases.map(c => c.name)).toEqual(['core/query-title', 'core/term-description']);
  for (const entry of result.cases) {
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.first);
  }
});
