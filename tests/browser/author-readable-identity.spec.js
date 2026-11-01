const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('invisible Core author never creates a nameless byline or archive heading', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One real WordPress fixture covers seven responsive widths.');
  test.setTimeout(180000);
  const slug = 'slateframe-author-a11y-' + randomUUID().slice(0, 12);
  const invisible = '\u200B';
  const userId = wp('user', 'create', slug, slug + '@example.invalid',
    '--role=author', '--display_name=' + invisible, '--description=' + invisible, '--porcelain');
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_author=' + userId, '--post_title=' + slug, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const meta = page.locator('.slateframe-entry-meta').first();
    await expect(meta.locator('.slateframe-published')).toHaveCount(1);
    await expect(meta.locator('.slateframe-meta-byline')).toHaveCount(0);
    await expect(meta.locator('a[href*="author"]')).toHaveCount(0);

    await page.goto('/?author=' + userId, { waitUntil: 'networkidle' });
    const author = page.locator('.slateframe-author-header');
    await expect(author.locator('h1 bdi')).toHaveText('Author');
    await expect(author.locator('.slateframe-archive-description')).toHaveCount(0);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, dir);
          const state = await author.evaluate(node => {
            const rect = node.getBoundingClientRect();
            return { left: rect.left, right: rect.right,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const axe = await new AxeBuilder({ page }).include('.slateframe-author-header')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    const skip = page.locator('a.skip-link[href="#main-content"]');
    await skip.focus();
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.emulateMedia({ forcedColors: 'active' });
    await author.screenshot({ path: 'test-artifacts/screenshots/author-blank-identity-390-rtl-400-forced-colors.png', animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await author.screenshot({ path: 'test-artifacts/screenshots/author-blank-identity-1440-ltr.png', animations: 'disabled' });
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
    wp('user', 'delete', userId, '--yes');
  }
});
