const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const widths = [320, 375, 390, 412, 768, 1440, 1920];

test('blank Core footer identity remains readable without inventing a copyright owner', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One real WordPress footer exercises the responsive matrix.');
  test.setTimeout(180000);
  const html = execFileSync('wp', ['eval', [
    'add_filter("pre_option_blogname", static function () { return "\\u{200B}"; });',
    'add_filter("pre_option_blogdescription", static function () { return "\\u{FE0F}"; });',
    'ob_start(); include get_stylesheet_directory() . "/footer.php"; echo ob_get_clean();',
  ].join(' '), '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.slateframe-site-footer').evaluate((node, markup) => {
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    const footer = parsed.querySelector('.slateframe-site-footer');
    if (!footer) throw new Error('Core footer did not render');
    node.replaceWith(footer);
  }, html);
  const footer = page.locator('.slateframe-site-footer');
  await expect(footer.locator('.slateframe-footer-brand strong bdi')).toHaveText('Home');
  await expect(footer.locator('.slateframe-footer-brand p')).toHaveCount(0);
  await expect(footer.locator('.slateframe-copyright bdi')).toHaveCount(1);
  await expect(footer.locator('.slateframe-copyright')).not.toContainText('Home');
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const direction of ['ltr', 'rtl']) {
      for (const fontSize of [16, 64]) {
        await setRootTextScale(page, fontSize, direction);
        const geometry = await footer.evaluate(node => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          width: node.getBoundingClientRect().width,
        }));
        expect(geometry.scroll, width + 'px ' + direction + ' ' + fontSize + 'px horizontal overflow')
          .toBeLessThanOrEqual(geometry.viewport + 1);
        expect(geometry.width).toBeLessThanOrEqual(geometry.viewport + 1);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await setRootTextScale(page, 64, 'rtl');
  const axe = await new AxeBuilder({ page }).include('.slateframe-site-footer')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  const directory = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(directory, { recursive: true });
  await page.emulateMedia({ forcedColors: 'active' });
  await footer.screenshot({
    path: path.join(directory, 'footer-blank-identity-390-rtl-400-forced-colors.png'),
    animations: 'disabled',
  });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await setRootTextScale(page, 16, 'ltr');
  await footer.screenshot({
    path: path.join(directory, 'footer-blank-identity-1440-ltr.png'),
    animations: 'disabled',
  });
});
