const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

test('Core search discovery exposes readable names for Unicode-invisible titles', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers the responsive matrix');
  test.setTimeout(120000);
  const marker = 'slateframe-unicode-title-' + randomUUID();
  const created = [];
  try {
    for (const [title, expected, suffix] of [
      ['&#xFE0F;', 'Untitled', 'blank'],
      ['&amp;', '&', 'visible'],
    ]) {
      const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
        '--post_title=' + title, '--post_content=' + marker + '-' + suffix, '--porcelain');
      created.push(postId);
      await page.goto('/?s=' + encodeURIComponent(marker + '-' + suffix), { waitUntil: 'networkidle' });
      const cards = page.locator('.slateframe-card-title a');
      await expect(cards).toHaveCount(1);
      const link = cards.first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAccessibleName(expected);
      expect(await link.getAttribute('href')).toBeTruthy();
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const direction of ['ltr', 'rtl']) {
          await setRootTextScale(page, 64, direction);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, suffix + ' ' + width + 'px ' + direction + ' 400%').toBeLessThanOrEqual(1);
          await expect(link).toHaveAccessibleName(expected);
          await link.focus();
          await expect(link).toBeFocused();
        }
      }
      await setRootTextScale(page, 16, 'ltr');
      const axe = await new AxeBuilder({ page }).include('.slateframe-grid')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(axe.violations, suffix).toEqual([]);
    }
  } finally {
    for (const postId of created) wp('post', 'delete', postId, '--force');
  }
});
