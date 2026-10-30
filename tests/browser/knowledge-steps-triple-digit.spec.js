const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('Core Knowledge Steps triple-digit badges fit their circle at 400%', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers the matrix');
  test.setTimeout(180000);
  const items = Array.from({ length: 101 }, (_, i) => '<li>Step ' + (i + 1) + ' 中文 العربية</li>').join('');
  const markup = '<!-- wp:list {"ordered":true,"className":"is-style-slateframe-steps"} -->' +
    '<ol class="wp-block-list is-style-slateframe-steps">' + items + '</ol><!-- /wp:list -->';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Knowledge triple-digit Steps', '--post_content=' + markup, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const list = page.locator('.slateframe-prose ol.is-style-slateframe-steps').first();
    const hundredth = list.locator(':scope > li').nth(99);
    await expect(list.locator(':scope > li')).toHaveCount(101);
    await expect(hundredth).toContainText('Step 100');
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) for (const font of [16, 32, 64]) {
        await setRootTextScale(page, font, dir);
        const result = await hundredth.evaluate(node => {
          const badge = getComputedStyle(node, '::before');
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          context.font = badge.fontWeight + ' ' + badge.fontSize + ' ' + badge.fontFamily;
          const rect = node.getBoundingClientRect();
          return { badgeFont: parseFloat(badge.fontSize), badgeWidth: parseFloat(badge.width),
            textWidth: context.measureText('100').width, direction: badge.direction,
            left: rect.left, right: rect.right,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        });
        const label = width + 'px ' + dir + ' ' + font + 'px';
        expect(result.badgeFont, label + ' bounded counter font').toBeCloseTo(Math.min(font * .72, 24), 1);
        expect(result.badgeWidth, label + ' Appearance floor').toBeGreaterThanOrEqual(44);
        expect(result.badgeWidth, label + ' bounded badge').toBeLessThanOrEqual(64);
        expect(result.textWidth, label + ' three digits fit inside badge').toBeLessThanOrEqual(result.badgeWidth - 4);
        expect(result.direction, label + ' logical direction').toBe(dir);
        expect(result.left, label + ' left containment').toBeGreaterThanOrEqual(-1);
        expect(result.right, label + ' right containment').toBeLessThanOrEqual(width + 1);
        expect(result.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
        if (width === 390 && dir === 'rtl' && font === 64) {
          await hundredth.evaluate(node => node.scrollIntoView({ block: 'start' }));
          await page.screenshot({ fullPage: false,
            path: 'test-artifacts/screenshots/knowledge-steps-triple-digit-390-rtl-400.png' });
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await hundredth.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ fullPage: false,
      path: 'test-artifacts/screenshots/knowledge-steps-triple-digit-1440-ltr.png' });
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page }).include('.is-style-slateframe-steps')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    const forced = await hundredth.evaluate(node => ({
      color: getComputedStyle(node, '::before').color,
      border: getComputedStyle(node, '::before').borderTopStyle,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(forced.color).not.toBe('transparent');
    expect(forced.border).toBe('solid');
    expect(forced.overflow).toBeLessThanOrEqual(1);
    await hundredth.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ fullPage: false,
      path: 'test-artifacts/screenshots/knowledge-steps-triple-digit-390-rtl-400-forced-colors.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
