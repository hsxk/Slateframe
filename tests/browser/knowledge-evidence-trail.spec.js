const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const pattern = () => wp('eval',
  "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-evidence-trail')['content'];");

test('registered evidence trail preserves source context across responsive and accessible Core layouts', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress fixture covers all seven viewports');
  test.setTimeout(180000);
  const blocks = pattern();
  expect(blocks).toContain('<!-- wp:columns');
  // Test multilingual content inside the actual Core columns, not only English prompts.
  const samples = [
    '日本語の出典確認と測定条件を記録する。長い文章でも文字が画面外へ逃げないこと。',
    '中文原始资料与日期必须可追溯。UnbrokenEvidenceIdentifier'.repeat(3),
    'العربية: توضيح القيود والافتراضات والبيانات الناقصة عند التحقق.'
  ];
  let sampleIndex = 0;
  const fixture = blocks.replace(/<\/div><!-- \/wp:column -->/g, marker => {
    const sample = samples[sampleIndex++];
    return '<!-- wp:paragraph --><p>' + sample + '</p><!-- /wp:paragraph -->' + marker;
  });
  expect(sampleIndex).toBe(3);
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Knowledge evidence presentation', '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const trail = page.locator('.slateframe-prose .slateframe-knowledge-evidence-trail').first();
    await expect(trail).toBeVisible();
    await expect(trail.locator('.wp-block-column')).toHaveCount(3);
    await expect(trail.locator('h2')).toHaveCount(1);
    await expect(trail.locator('h3')).toHaveCount(3);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await page.locator('html').evaluate((node, state) => {
            node.dir = state.dir;
            node.style.fontSize = state.font + 'px';
          }, { dir, font });
          const geometry = await trail.evaluate(node => {
            const outer = node.getBoundingClientRect();
            const columns = [...node.querySelectorAll('.wp-block-column')];
            return {
              viewport: document.documentElement.clientWidth,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              left: outer.left, right: outer.right,
              columns: columns.map(column => {
                const box = column.getBoundingClientRect();
                return { left: box.left, right: box.right };
              }),
              textOutsideColumn: columns.some(column => {
                const bounds = column.getBoundingClientRect();
                return [...column.querySelectorAll('h3, p')].some(child => {
                  const range = document.createRange();
                  range.selectNodeContents(child);
                  return [...range.getClientRects()].some(rect => rect.width > 0 &&
                    (rect.left < bounds.left - 1 || rect.right > bounds.right + 1));
                });
              }),
              textOutside: [...node.querySelectorAll('h2, h3, p')].some(child => {
                const range = document.createRange();
                range.selectNodeContents(child);
                return [...range.getClientRects()].some(rect =>
                  rect.width > 0 && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1));
              }),
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(geometry.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(geometry.textOutside, label + ' text fragment clipping').toBe(false);
          expect(geometry.textOutsideColumn, label + ' column text clipping').toBe(false);
          expect(geometry.left, label + ' trail left').toBeGreaterThanOrEqual(-1);
          expect(geometry.right, label + ' trail right').toBeLessThanOrEqual(geometry.viewport + 1);
          expect(geometry.columns, label + ' columns').toHaveLength(3);
          for (const box of geometry.columns) {
            expect(box.left, label + ' column left').toBeGreaterThanOrEqual(-1);
            expect(box.right, label + ' column right').toBeLessThanOrEqual(geometry.viewport + 1);
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page }).include('.slateframe-knowledge-evidence-trail')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    // The whole trail is taller than the viewport at zoom. Anchor the heading
    // instead of centering the huge container and photographing a mid-paragraph.
    await trail.locator('h2').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/knowledge-evidence-390-rtl-200-forced-colors.png',
      animations: 'disabled' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    await trail.locator('h2').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/knowledge-evidence-390-rtl-400-forced-colors.png',
      animations: 'disabled' });
    // Capture each complete column so reviewers can inspect all text at 400%.
    for (const [index, label] of ['claim', 'source', 'limits'].entries()) {
      await trail.locator('.wp-block-column').nth(index).screenshot({
        path: 'test-artifacts/screenshots/knowledge-evidence-390-rtl-400-' + label + '-column.png',
        animations: 'disabled'
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = ''; });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    await page.screenshot({ path: 'test-artifacts/screenshots/knowledge-evidence-1440-ltr.png',
      animations: 'disabled' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('evidence trail remains native and valid inside Gutenberg', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Authenticated editor fixture');
  test.setTimeout(120000);
  const blocks = pattern();
  const id = wp('post', 'create', '--post_type=page', '--post_status=draft',
    '--post_title=Knowledge evidence editor', '--post_content=' + blocks, '--porcelain');
  try {
    await openAuthenticatedEditor(page, id);
    const result = await page.evaluate(() => {
      const names = [], invalid = [];
      const visit = blocks => blocks.forEach(block => {
        names.push(block.name);
        if (block.isValid === false) invalid.push(block.name);
        visit(block.innerBlocks || []);
      });
      const editor = window.wp.data.select('core/block-editor');
      visit(editor.getBlocks());
      return { names, invalid };
    });
    expect(result.invalid).toEqual([]);
    expect(result.names).not.toContain('core/missing');
    expect(result.names.filter(name => name === 'core/columns')).toHaveLength(1);
    expect(result.names.filter(name => name === 'core/column')).toHaveLength(3);
    expect(result.names.filter(name => name === 'core/heading')).toHaveLength(4);
    const framed = await page.locator('iframe[name="editor-canvas"]').count() > 0;
    const canvas = framed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
    const editor = canvas.locator('.editor-styles-wrapper').first();
    const trail = editor.locator('.slateframe-knowledge-evidence-trail').first();
    await expect(trail).toBeVisible();
    for (const [width, dir, font] of [[390, 'rtl', '200%'], [1440, 'ltr', '']]) {
      await page.setViewportSize({ width, height: 900 });
      await editor.evaluate((node, state) => { node.dir = state.dir; node.style.fontSize = state.font; }, { dir, font });
      const geometry = await trail.evaluate(node => {
        const root = node.closest('.editor-styles-wrapper');
        return { overflow: root.scrollWidth - root.clientWidth,
          columns: node.querySelectorAll('.wp-block-column').length,
          headings: node.querySelectorAll('h2, h3').length };
      });
      expect(geometry.overflow, width + 'px Gutenberg overflow').toBeLessThanOrEqual(1);
      expect(geometry.columns).toBe(3);
      expect(geometry.headings).toBe(4);
    }
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
