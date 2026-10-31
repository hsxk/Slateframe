const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core-authored pages never duplicate the classic comment form', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390,
    'One disposable WordPress page pair covers all widths and directions.');
  test.setTimeout(180000);
  const suffix = randomUUID().slice(0, 12);
  let coreId, classicId;
  try {
    coreId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--comment_status=open', '--post_title=Core page comments ' + suffix,
      '--post_content=<!-- wp:post-comments-form /-->', '--porcelain');
    classicId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--comment_status=open', '--post_title=Classic page comments ' + suffix,
      '--post_content=Ordinary page without a Core discussion block', '--porcelain');

    await page.goto('/?page_id=' + coreId, { waitUntil: 'networkidle' });
    const core = page.locator('.wp-block-post-comments-form');
    await expect(core).toHaveCount(1);
    await expect(core.locator('form#commentform')).toHaveCount(1);
    await expect(page.locator('form#commentform')).toHaveCount(1);
    await expect(page.locator('.slateframe-comments')).toHaveCount(0);
    await expect(page.locator('textarea#comment')).toHaveCount(1);
    const submit = core.locator('button#submit');
    await expect(submit).toHaveCount(1);
    await expect(core.locator('input#submit')).toHaveCount(0);
    await expect(submit).toHaveText(/Post Comment/);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });

    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, dir) => {
          node.dir = dir;
          node.style.fontSize = '16px';
        }, direction);
        const state = await core.evaluate(node => {
          const bounds = node.getBoundingClientRect();
          const root = document.documentElement;
          return {
            overflow: root.scrollWidth - root.clientWidth,
            left: bounds.left,
            right: bounds.right,
            formCount: document.querySelectorAll('form#commentform').length,
          };
        });
        const label = width + 'px ' + direction;
        expect(state.formCount, label + ' one native form').toBe(1);
        expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
        expect(state.left, label + ' left bound').toBeGreaterThanOrEqual(-1);
        expect(state.right, label + ' right bound').toBeLessThanOrEqual(width + 1);
      }
    }

    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => {
      node.dir = 'rtl';
      node.style.fontSize = '64px';
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    // Inputs cannot wrap translated values; the Core-owned form now uses a
    // native submit button so every text fragment remains visible at 400%.
    const labelGeometry = await submit.evaluate(node => {
      const box = node.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      const lines = [...range.getClientRects()];
      return {
        left: box.left, right: box.right, height: box.height,
        scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
        lineCount: lines.length,
        textContent: node.textContent,
        textInside: lines.every(line => line.left >= box.left - 1 && line.right <= box.right + 1),
      };
    });
    expect(labelGeometry.textContent).toContain('Post Comment');
    expect(labelGeometry.lineCount).toBeGreaterThanOrEqual(2);
    expect(labelGeometry.textInside, 'complete native submit label').toBe(true);
    expect(labelGeometry.scrollWidth, 'submit label must not clip').toBeLessThanOrEqual(labelGeometry.clientWidth + 1);
    expect(labelGeometry.left).toBeGreaterThanOrEqual(-1);
    expect(labelGeometry.right).toBeLessThanOrEqual(391);
    expect(labelGeometry.height).toBeGreaterThanOrEqual(44);
    const textarea = core.locator('textarea#comment');
    await textarea.focus();
    await expect(textarea).toBeFocused();
    const a11y = await new AxeBuilder({ page }).include('.wp-block-post-comments-form')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    // Full-page capture retains the complete form even when 400% text exceeds the viewport.
    await page.screenshot({
      path: 'test-artifacts/screenshots/page-comments-core-390-rtl-400.png',
      animations: 'disabled', fullPage: true,
    });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await expect(textarea).toBeFocused();
    await page.screenshot({
      path: 'test-artifacts/screenshots/page-comments-core-390-rtl-400-forced-colors.png',
      animations: 'disabled', fullPage: true,
    });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(node => {
      node.dir = 'ltr';
      node.style.fontSize = '16px';
    });
    await core.screenshot({
      path: 'test-artifacts/screenshots/page-comments-core-1440-ltr.png',
      animations: 'disabled',
    });

    await page.goto('/?page_id=' + classicId, { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-comments')).toHaveCount(1);
    await expect(page.locator('form#commentform')).toHaveCount(1);
    await expect(page.locator('.wp-block-post-comments-form')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => {
      node.dir = 'rtl';
      node.style.fontSize = '16px';
    });
    await page.locator('.slateframe-comments').screenshot({
      path: 'test-artifacts/screenshots/page-comments-classic-390-rtl.png',
      animations: 'disabled',
    });

    wp('post', 'update', coreId, '--comment_status=closed');
    await page.goto('/?page_id=' + coreId, { waitUntil: 'networkidle' });
    await expect(page.locator('form#commentform')).toHaveCount(0);
    await expect(page.locator('.slateframe-comments')).toHaveCount(0);
  } finally {
    if (coreId) wp('post', 'delete', coreId, '--force');
    if (classicId) wp('post', 'delete', classicId, '--force');
  }
});
