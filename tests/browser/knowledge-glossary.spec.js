const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000
}).trim();
const pattern = () => wp('eval',
  "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-glossary')['content'];");

test('registered glossary retains text at all widths, directions and zoom levels', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Single WordPress fixture covers seven widths');
  test.setTimeout(180000);
  // Exercise actual mixed-script content rather than testing only English under RTL.
  const fixture = pattern()
    .replace('First term', '日本語の長い専門用語と説明')
    .replace('Second term', '中文术语与UnbrokenGlossaryIdentifier'.repeat(3))
    .replace('Third term', 'مصطلح عربي مع شرح مختصر');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Glossary test', '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const glossary = page.locator('.slateframe-prose .slateframe-knowledge-glossary').first();
    await expect(glossary).toBeVisible();
    await expect(glossary.locator('h2')).toHaveCount(1);
    await expect(glossary.locator('h3')).toHaveCount(3);
    await expect(glossary).toContainText('日本語');
    await expect(glossary).toContainText('中文术语');
    await expect(glossary).toContainText('مصطلح');
    await expect(glossary.locator('.is-style-slateframe-definition')).toHaveCount(3);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await page.locator('html').evaluate((node, state) => {
            node.dir = state.dir; node.style.fontSize = state.font + 'px';
          }, { dir, font });
          const result = await glossary.evaluate(node => {
            const root = document.documentElement;
            const rect = node.getBoundingClientRect();
            const clipped = [...node.querySelectorAll('h2,h3,p')].some(child => {
              const range = document.createRange();
              range.selectNodeContents(child);
              return [...range.getClientRects()].some(r => r.width > 0 &&
                (r.left < -1 || r.right > root.clientWidth + 1));
            });
            return { overflow: root.scrollWidth - root.clientWidth,
              left: rect.left, right: rect.right, width: root.clientWidth, clipped };
          });
          const label = width + ' ' + dir + ' ' + font;
          expect(result.overflow, label).toBeLessThanOrEqual(1);
          expect(result.left, label).toBeGreaterThanOrEqual(-1);
          expect(result.right, label).toBeLessThanOrEqual(result.width + 1);
          expect(result.clipped, label).toBe(false);
        }
      }
    }
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '64px'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page }).include('.slateframe-knowledge-glossary')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await glossary.locator('h2').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/knowledge-glossary-390-rtl-400-forced-colors.png',
      animations: 'disabled' });
    for (const [i, label] of ['first', 'second', 'third'].entries()) {
      await glossary.locator('.is-style-slateframe-definition').nth(i).screenshot({
        path: 'test-artifacts/screenshots/knowledge-glossary-390-rtl-400-' + label + '.png',
        animations: 'disabled'
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = ''; });
    await page.emulateMedia({ forcedColors: 'none' });
    await glossary.locator('h2').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-artifacts/screenshots/knowledge-glossary-1440-ltr.png',
      animations: 'disabled' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('glossary remains editable and valid in Gutenberg', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Authenticated editor fixture');
  test.setTimeout(120000);
  const id = wp('post', 'create', '--post_type=page', '--post_status=draft',
    '--post_title=Glossary editor', '--post_content=' + pattern(), '--porcelain');
  try {
    await openAuthenticatedEditor(page, id);
    const state = await page.evaluate(() => {
      const names = [], invalid = [];
      const visit = blocks => blocks.forEach(block => {
        names.push(block.name);
        if (block.isValid === false) invalid.push(block.name);
        visit(block.innerBlocks || []);
      });
      visit(window.wp.data.select('core/block-editor').getBlocks());
      return { names, invalid };
    });
    expect(state.invalid).toEqual([]);
    expect(state.names).not.toContain('core/missing');
    expect(state.names.filter(n => n === 'core/heading')).toHaveLength(4);
    expect(state.names.filter(n => n === 'core/group')).toHaveLength(4);
    const framed = await page.locator('iframe[name="editor-canvas"]').count() > 0;
    const canvas = framed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
    const editor = canvas.locator('.editor-styles-wrapper').first();
    const glossary = editor.locator('.slateframe-knowledge-glossary').first();
    await expect(glossary).toBeVisible();
    for (const [width, dir, font] of [[390, 'rtl', '200%'], [1440, 'ltr', '']]) {
      await page.setViewportSize({ width, height: 900 });
      await editor.evaluate((node, state) => { node.dir = state.dir; node.style.fontSize = state.font; },
        { dir, font });
      const overflow = await glossary.evaluate(node => {
        const root = node.closest('.editor-styles-wrapper');
        return root.scrollWidth - root.clientWidth;
      });
      expect(overflow, width + 'px editor overflow').toBeLessThanOrEqual(1);
    }
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
