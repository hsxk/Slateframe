const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('native previous and next titles isolate mixed scripts at every breakpoint', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One disposable WordPress fixture covers seven responsive widths.');
  test.setTimeout(180000);
  const token = 'slateframe-adjacent-' + randomUUID().slice(0, 12);
  const posts = [];
  try {
    for (const [day, title] of [
      ['20', '日本語 中文 — 前の記事'],
      ['21', 'Center post — ' + token],
      ['22', 'العربية 日本語 — التالي'],
    ]) {
      posts.push(wp('post', 'create', '--post_type=post', '--post_status=publish',
        '--post_date=2026-10-' + day + ' 12:00:00', '--post_title=' + title,
        '--porcelain'));
    }
    await page.goto('/?p=' + posts[1], { waitUntil: 'networkidle' });
    const nav = page.locator('.slateframe-post-navigation');
    await expect(nav).toBeVisible();
    for (const side of ['previous', 'next']) {
      const link = nav.locator('.nav-' + side + ' a');
      await expect(link).toHaveCount(1);
      await expect(link.locator('span > bdi')).toHaveCount(1);
      await expect(link.locator('.slateframe-post-navigation-label')).toBeVisible();
      expect(await link.locator('bdi').evaluate(node => getComputedStyle(node).unicodeBidi))
        .toBe('isolate');
      await link.focus();
      await expect(link).toBeFocused();
    }
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const state = await nav.evaluate(node => ({
            left: node.getBoundingClientRect().left,
            right: node.getBoundingClientRect().right,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }));
          const label = width + 'px ' + direction + ' ' + font + 'px';
          expect(state.overflow, label + ' horizontal overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const axe = await new AxeBuilder({ page }).include('.slateframe-post-navigation')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.emulateMedia({ forcedColors: 'active' });
    await nav.screenshot({ path: 'test-artifacts/screenshots/post-navigation-bidi-390-rtl-400-forced-colors.png', animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await nav.screenshot({ path: 'test-artifacts/screenshots/post-navigation-bidi-1440-ltr.png', animations: 'disabled' });
  } finally {
    for (const post of posts) wp('post', 'delete', post, '--force');
  }
});
