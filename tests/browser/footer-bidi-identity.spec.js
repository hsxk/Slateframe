const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const AxeBuilder = require('@axe-core/playwright').default;

const title = 'العربية / 日本語 — Slateframe';
const description = '日本語と中文 / العربية';
const widths = [320, 375, 390, 412, 768, 1440, 1920];

const wp = (php) => execFileSync('wp', ['eval', php, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
});

test('real Core footer isolates mixed-direction site identity at 400% without layout overflow', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One real WordPress footer exercises the full viewport matrix.');
  test.setTimeout(180000);
  const html = wp([
    'add_filter("pre_option_blogname", static function () { return "العربية / 日本語 — Slateframe"; });',
    'add_filter("pre_option_blogdescription", static function () { return "日本語と中文 / العربية"; });',
    'ob_start(); include get_stylesheet_directory() . "/footer.php"; echo ob_get_clean();',
  ].join(' '));
  expect(html).toContain('<bdi>');
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.slateframe-site-footer').evaluate((node, markup) => {
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    const rendered = parsed.querySelector('.slateframe-site-footer');
    if (!rendered) throw new Error('footer.php did not render a native footer');
    node.replaceWith(rendered);
  }, html);
  const footer = page.locator('.slateframe-site-footer');
  const brand = footer.locator('.slateframe-footer-brand');
  const copyright = footer.locator('.slateframe-copyright');
  await expect(brand.locator('strong bdi')).toHaveText(title);
  await expect(brand.locator('p bdi')).toHaveText(description);
  await expect(copyright.locator('bdi')).toHaveText([/^© \d{4}$/, title]);
  const isolates = await footer.locator('bdi').evaluateAll(nodes => nodes.map(node => ({
    explicitDirection: node.getAttribute('dir'),
    unicodeBidi: getComputedStyle(node).unicodeBidi,
  })));
  expect(isolates).toHaveLength(4);
  for (const isolate of isolates) {
    expect(isolate.explicitDirection).toBeNull();
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
        const geometry = await footer.evaluate(node => {
          const rect = node.getBoundingClientRect();
          return {
            viewport: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
            left: rect.left, right: rect.right,
            innerScroll: node.scrollWidth, innerWidth: node.clientWidth,
          };
        });
        expect(geometry.scroll, `${width}px ${direction} ${zoom} document overflow`)
          .toBeLessThanOrEqual(geometry.viewport + 1);
        expect(geometry.innerScroll, `${width}px ${direction} ${zoom} footer overflow`)
          .toBeLessThanOrEqual(geometry.innerWidth + 1);
        expect(geometry.left).toBeGreaterThanOrEqual(-1);
        expect(geometry.right).toBeLessThanOrEqual(width + 1);
      }
    }
  }
  const directory = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(directory, { recursive: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '400%'; });
  const axe = await new AxeBuilder({ page }).include('.slateframe-site-footer')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  await page.emulateMedia({ forcedColors: 'active' });
  await footer.screenshot({
    path: path.join(directory, 'footer-bidi-390-rtl-400-forced-colors.png'),
    animations: 'disabled',
  });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = '100%'; });
  await footer.screenshot({
    path: path.join(directory, 'footer-bidi-1440-ltr.png'),
    animations: 'disabled',
  });
});
