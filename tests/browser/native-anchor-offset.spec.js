const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const destination = 'slateframe-native-anchor-destination';
const content = '<!-- wp:group {"className":"slateframe-anchor-offset-fixture"} -->' +
  '<div class="wp-block-group slateframe-anchor-offset-fixture">' +
  '<!-- wp:buttons --><div class="wp-block-buttons">' +
  '<!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#' +
  destination + '">Jump / 移動 / الانتقال</a></div><!-- /wp:button -->' +
  '</div><!-- /wp:buttons -->' +
  '<!-- wp:html --><div style="height:1400px" aria-hidden="true"></div><!-- /wp:html -->' +
  '<!-- wp:paragraph --><p id="' + destination + '">Destination 日本語 中文 العربية</p><!-- /wp:paragraph -->' +
  '</div><!-- /wp:group -->';

test('native paragraph fragments clear the sticky header without changing mobile scrolling', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress page covers all widths');
  test.setTimeout(180000);
  const postId = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Native anchor offset ' + randomUUID(), '--post_content=' + content, '--porcelain');
  try {
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, ...(width === 390 || width === 1440 ? [32, 64] : [])]) {
          await page.goto('/?page_id=' + postId, { waitUntil: 'networkidle' });
          await setRootTextScale(page, font, dir);
          const root = page.locator('.slateframe-anchor-offset-fixture');
          const link = root.locator('a[href="#' + destination + '"]');
          const target = page.locator('#' + destination);
          await expect(link).toHaveCount(1);
          await expect(target).toHaveCount(1);
          await link.focus();
          await expect(link).toBeFocused();
          await page.keyboard.press('Enter');
          await expect.poll(() => page.evaluate(() => location.hash)).toBe('#' + destination);
          const result = await target.evaluate(node => {
            const header = document.querySelector('.slateframe-site-header');
            return {
              top: node.getBoundingClientRect().top,
              margin: parseFloat(getComputedStyle(node).scrollMarginBlockStart),
              headerHeight: header.getBoundingClientRect().height,
              headerPosition: getComputedStyle(header).position,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              scrollY: window.scrollY,
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(result.scrollY, label + ' fragment navigation scroll').toBeGreaterThan(0);
          expect(result.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          if (width > 480) {
            expect(result.headerPosition, label + ' desktop header').toBe('sticky');
            expect(result.margin, label + ' scroll offset').toBeGreaterThanOrEqual(result.headerHeight);
            expect(result.top, label + ' target clears sticky header')
              .toBeGreaterThanOrEqual(result.headerHeight - 2);
          } else {
            expect(result.headerPosition, label + ' mobile header').toBe('relative');
            expect(result.margin, label + ' mobile no unnecessary offset').toBe(0);
            expect(result.top, label + ' mobile target in viewport').toBeGreaterThanOrEqual(-2);
          }
          if (([390, 768, 1440].includes(width) && font === 16) ||
              ([390, 1440].includes(width) && font === 64 && dir === 'rtl')) {
            await page.screenshot({ path: 'test-artifacts/screenshots/native-anchor-' + width + '-' +
              dir + '-' + font + '.png', animations: 'disabled' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/?page_id=' + postId, { waitUntil: 'networkidle' });
    await setRootTextScale(page, 32, 'rtl');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.locator('.slateframe-anchor-offset-fixture a').first().focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#' + destination);
    await page.screenshot({ path: 'test-artifacts/screenshots/native-anchor-390-rtl-32-forced-colors.png',
      animations: 'disabled' });
  } finally {
    wp('post', 'delete', postId, '--force');
  }
});
