const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { execFileSync } = require('node:child_process');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
});
const widths = [320, 375, 390, 412, 768, 1440, 1920];

async function checkReadableResponsiveHeading(page, root, expected) {
  const heading = root.locator('h1.slateframe-page-title');
  await expect(heading).toHaveText(expected);
  await expect(heading).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const direction of ['ltr', 'rtl']) {
      for (const font of [16, 64]) {
        await setRootTextScale(page, font, direction);
        const state = await root.evaluate(node => ({
          left: node.getBoundingClientRect().left,
          right: node.getBoundingClientRect().right,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        const label = width + 'px ' + direction + ' ' + font + 'px';
        expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
        expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
        expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await setRootTextScale(page, 64, 'rtl');
  const axe = await new AxeBuilder({ page }).include('.slateframe-page-header')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  const skip = page.locator('a.skip-link[href="#main-content"]');
  await skip.focus();
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('main#main-content')).toBeFocused();
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
}

test('Core posts index with invisible site title keeps a readable H1', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One real WordPress route covers seven widths.');
  test.setTimeout(180000);
  // Exercise the actual HTTP route. WP-CLI-rendered fragments omit conditional
  // styles and can cause false overflow failures at 400% text zoom.
  const originalTitle = wp('option', 'get', 'blogname').replace(/\r?\n$/, '');
  try {
    wp('option', 'update', 'blogname', '\u200B');
    await page.goto('/', { waitUntil: 'networkidle' });
    const root = page.locator('main#main-content .slateframe-page-header');
    await checkReadableResponsiveHeading(page, root, 'Latest posts');
    await expect(root.locator('h1 bdi')).toHaveText('Latest posts');
    await page.emulateMedia({ forcedColors: 'active' });
    await root.screenshot({ path: 'test-artifacts/screenshots/index-readable-fallback-390-rtl-400-forced-colors.png', animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await root.screenshot({ path: 'test-artifacts/screenshots/index-readable-fallback-1440-ltr.png', animations: 'disabled' });
  } finally {
    wp('option', 'update', 'blogname', originalTitle);
  }
});

test('Core search with invisible query keeps an H1 and native form', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One real WordPress route covers seven widths.');
  test.setTimeout(180000);
  // WordPress must enqueue the real is_search() form stylesheet.
  await page.goto('/?s=%E2%80%8B', { waitUntil: 'networkidle' });
  const root = page.locator('main#main-content .slateframe-page-header');
  await expect(page.locator('link#slateframe-forms-css')).toHaveCount(1);
  await expect(page.locator('link#slateframe-search-form-css')).toHaveCount(1);
  await checkReadableResponsiveHeading(page, root, 'Search results');
  await expect(root.locator('h1 bdi')).toHaveCount(0);
  const form = root.locator('form.slateframe-search-form');
  await expect(form.locator('input[name="s"]')).toHaveCount(1);
  await expect(form.locator('button[type="submit"]')).toBeVisible();
  await form.locator('input[name="s"]').focus();
  await expect(form.locator('input[name="s"]')).toBeFocused();
  await page.emulateMedia({ forcedColors: 'active' });
  await root.screenshot({ path: 'test-artifacts/screenshots/search-readable-fallback-390-rtl-400-forced-colors.png', animations: 'disabled' });
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await setRootTextScale(page, 16, 'ltr');
  await root.screenshot({ path: 'test-artifacts/screenshots/search-readable-fallback-1440-ltr.png', animations: 'disabled' });
});
