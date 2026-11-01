const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const widths = [320, 375, 390, 412, 768, 1440, 1920];

test('blank Core site title keeps an accessible 44px home target', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One real WordPress header exercises the responsive matrix.');
  test.setTimeout(180000);
  const html = execFileSync('wp', ['eval', [
    'add_filter("pre_option_blogname", static function () { return ""; });',
    'add_filter("pre_option_blogdescription", static function () { return "日本語と中文 / العربية"; });',
    'add_filter("theme_mod_custom_logo", static function () { return 0; });',
    'ob_start(); include get_stylesheet_directory() . "/header.php"; echo ob_get_clean();',
  ].join(' '), '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.slateframe-brand-copy').evaluate((node, markup) => {
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    const copy = parsed.querySelector('.slateframe-brand-copy');
    if (!copy) throw new Error('Core header did not render the brand copy');
    node.replaceWith(copy);
  }, html);
  const brand = page.locator('.slateframe-brand');
  await expect(brand.locator('.slateframe-brand-title bdi')).toHaveText('Home');
  await expect(brand.locator('.screen-reader-text')).toHaveCount(0);
  await expect(brand.locator('.slateframe-brand-tagline bdi')).toHaveText('日本語と中文 / العربية');
  await expect(brand).toHaveAttribute('href', /\/$/);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const direction of ['ltr', 'rtl']) {
      for (const fontSize of [16, 64]) {
        await setRootTextScale(page, fontSize, direction);
        const state = width + 'px ' + direction + ' ' + fontSize + 'px';
        await expect(brand).toHaveAccessibleName(/Home/);
        const geometry = await brand.evaluate(node => ({
          height: node.getBoundingClientRect().height,
          width: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(geometry.height, state + ' touch height').toBeGreaterThanOrEqual(43.99);
        expect(geometry.scroll, state + ' horizontal overflow').toBeLessThanOrEqual(geometry.width + 1);
        await brand.focus();
        await expect(brand).toBeFocused();
      }
    }
  }
  // The bounded Appearance control must also expand this native home target.
  await page.setViewportSize({ width: 390, height: 900 });
  await setRootTextScale(page, 16, 'ltr');
  await page.locator('html').evaluate(node => node.style.setProperty('--slateframe-control', '56px'));
  await expect.poll(() => brand.evaluate(node => node.getBoundingClientRect().height))
    .toBeGreaterThanOrEqual(55.99);
  await page.locator('html').evaluate(node => node.style.removeProperty('--slateframe-control'));
  await page.setViewportSize({ width: 390, height: 900 });
  await setRootTextScale(page, 64, 'rtl');
  const axe = await new AxeBuilder({ page }).include('.slateframe-site-header')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  const directory = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(directory, { recursive: true });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('.slateframe-site-header').screenshot({
    path: path.join(directory, 'header-blank-brand-390-rtl-400-forced-colors.png'),
    animations: 'disabled',
  });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await setRootTextScale(page, 16, 'ltr');
  await page.locator('.slateframe-site-header').screenshot({
    path: path.join(directory, 'header-blank-brand-1440-ltr.png'),
    animations: 'disabled',
  });
});
