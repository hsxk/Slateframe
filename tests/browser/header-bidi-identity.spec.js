const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const AxeBuilder = require('@axe-core/playwright').default;

const title = 'العربية / 日本語 — Slateframe';
const description = '日本語と中文 / العربية';
const widths = [320, 375, 390, 412, 768, 1440, 1920];

test('native header isolates Core site identity without disrupting navigation or zoom', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One real WordPress header exercises all required viewports.');
  test.setTimeout(180000);
  const html = execFileSync('wp', ['eval', [
    'add_filter("pre_option_blogname", static function () { return "العربية / 日本語 — Slateframe"; });',
    'add_filter("pre_option_blogdescription", static function () { return "日本語と中文 / العربية"; });',
    'ob_start(); include get_stylesheet_directory() . "/header.php"; echo ob_get_clean();',
  ].join(' '), '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.slateframe-brand-copy').evaluate((node, markup) => {
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    const copy = parsed.querySelector('.slateframe-brand-copy');
    if (!copy) throw new Error('Core header.php did not render site identity');
    node.replaceWith(copy);
  }, html);
  const header = page.locator('.slateframe-site-header');
  const brand = header.locator('.slateframe-brand');
  await expect(brand.locator('.slateframe-brand-title bdi')).toHaveText(title);
  await expect(brand.locator('.slateframe-brand-tagline bdi')).toHaveText(description);
  const isolates = await brand.locator('bdi').evaluateAll(nodes => nodes.map(node => ({
    direction: node.getAttribute('dir'),
    unicodeBidi: getComputedStyle(node).unicodeBidi,
  })));
  expect(isolates).toHaveLength(2);
  for (const isolate of isolates) {
    expect(isolate.direction).toBeNull();
    expect(isolate.unicodeBidi).toBe('isolate');
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const direction of ['ltr', 'rtl']) {
      for (const zoom of ['100%', '400%']) {
        await page.locator('html').evaluate((node, state) => {
          node.dir = state.direction;
          node.style.fontSize = state.zoom;
        }, { direction, zoom });
        const geometry = await header.evaluate(node => ({
          documentWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          headerWidth: node.clientWidth,
          headerScroll: node.scrollWidth,
        }));
        const state = width + 'px ' + direction + ' ' + zoom;
        expect(geometry.scrollWidth, state + ' document overflow')
          .toBeLessThanOrEqual(geometry.documentWidth + 1);
        expect(geometry.headerScroll, state + ' header overflow')
          .toBeLessThanOrEqual(geometry.headerWidth + 1);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '400%'; });
  await brand.focus();
  await expect(brand).toBeFocused();
  const axe = await new AxeBuilder({ page }).include('.slateframe-site-header')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  const directory = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(directory, { recursive: true });
  await page.emulateMedia({ forcedColors: 'active' });
  await header.screenshot({
    path: path.join(directory, 'header-bidi-390-rtl-400-forced-colors.png'),
    animations: 'disabled',
  });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = '100%'; });
  await header.screenshot({
    path: path.join(directory, 'header-bidi-1440-ltr.png'),
    animations: 'disabled',
  });
});
