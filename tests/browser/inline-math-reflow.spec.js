const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();
const math = '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow>' +
  Array.from({ length: 18 }, (_, i) => '<mi>LongMathematicalIdentifier' + i + '</mi><mo>+</mo>').join('') +
  '<mn>12345</mn></mrow></math>';
const content = '<!-- wp:group {"className":"slateframe-inline-math-fixture"} -->' +
  '<div class="wp-block-group slateframe-inline-math-fixture">' +
  '<!-- wp:paragraph --><p class="math-paragraph">Paragraph ' + math + ' tail</p><!-- /wp:paragraph -->' +
  '<!-- wp:heading --><h2 class="wp-block-heading math-heading">Heading ' + math + ' tail</h2><!-- /wp:heading -->' +
  '<!-- wp:list --><ul class="wp-block-list"><li class="math-list">List ' + math + ' tail</li></ul><!-- /wp:list -->' +
  '<!-- wp:html --><div class="wp-block-math"><math display="block" xmlns="http://www.w3.org/1998/Math/MathML"><mi>Standalone</mi></math></div><!-- /wp:html -->' +
  '</div><!-- /wp:group -->';

test('native inline MathML remains bounded at computed 100–400% zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress page tests seven widths');
  test.setTimeout(180000);
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Inline MathML reflow', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const fixture = page.locator('.slateframe-inline-math-fixture');
    await expect(fixture).toBeVisible();
    const inline = fixture.locator('math:not([display="block"])');
    await expect(inline).toHaveCount(3);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir;
            node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const metrics = await fixture.evaluate(node => ({
            font: parseFloat(getComputedStyle(document.documentElement).fontSize),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            viewport: document.documentElement.clientWidth,
            inline: [...node.querySelectorAll('math:not([display="block"])')].map(mathNode => {
              const rect = mathNode.getBoundingClientRect();
              return { width: rect.width, left: rect.left, right: rect.right,
                scroll: mathNode.scrollWidth, client: mathNode.clientWidth,
                display: getComputedStyle(mathNode).display };
            }),
            standalone: getComputedStyle(node.querySelector('.wp-block-math math')).display,
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.font, label).toBeCloseTo(font, 1);
          expect(metrics.overflow, label).toBeLessThanOrEqual(1);
          expect(metrics.inline, label).toHaveLength(3);
          expect(metrics.standalone, label).not.toBe('inline-block');
          for (const item of metrics.inline) {
            expect(item.display, label).toBe('inline-block');
            expect(item.width, label).toBeGreaterThan(0);
            expect(item.width, label).toBeLessThanOrEqual(metrics.viewport);
            expect(item.left, label).toBeGreaterThanOrEqual(-1);
            expect(item.right, label).toBeLessThanOrEqual(metrics.viewport + 1);
          }
          if (width === 320 && font === 64) {
            for (const item of metrics.inline) expect(item.scroll, label).toBeGreaterThan(item.client);
          }
          if (width === 390 && font === 64) {
            for (const [selector, kind] of [['.math-paragraph', 'paragraph'],
              ['.math-heading', 'heading'], ['.math-list', 'list']]) {
              if (kind === 'list' && dir === 'rtl') continue;
              await fixture.locator(selector).scrollIntoViewIfNeeded();
              await page.screenshot({ path: 'test-artifacts/screenshots/inline-math-390-' + dir + '-400-' + kind + '.png',
                animations: 'disabled' });
            }
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '64px'; });
    await page.emulateMedia({ forcedColors: 'active' });
    await fixture.locator('.math-heading').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/inline-math-390-rtl-400-forced-colors.png',
      animations: 'disabled' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('native Gutenberg inline MathML roundtrip does not change the authored post', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport?.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const created = blocks.createBlock('core/paragraph', { content:
      'Native <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math> content' });
    const serialized = blocks.serialize(created);
    const parsed = blocks.parse(serialized);
    return { before, after: blocks.serialize(editor.getBlocks()), serialized,
      roundtrip: blocks.serialize(parsed), name: parsed[0]?.name, valid: parsed[0]?.isValid };
  });
  expect(result.after).toBe(result.before);
  expect(result.name).toBe('core/paragraph');
  expect(result.valid).toBe(true);
  expect(result.serialized).toContain('<math');
  expect(result.roundtrip).toBe(result.serialized);
});
