const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const widths = [320, 375, 390, 412, 768, 1440, 1920];
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
});
const plugin = '/tmp/wp-browser/wp-content/mu-plugins/slateframe-archive-heading-' + process.pid + '.php';

// Only the flagged HTTP request receives the test filter. CI runs this
// file in the serialized stateful phase; other WordPress routes are unchanged.
const isolatedFilter = [
  '<?php',
  "add_filter( 'get_the_archive_title', static function ( $title ) {",
  "    if ( isset( $_GET['sf_archive_title_test'] ) && '1' === $_GET['sf_archive_title_test'] ) {",
  '        return "\\xE2\\x80\\x8B";',
  '    }',
  '    return $title;',
  '} );',
  '',
].join('\n');

test('Core archive retains a readable title when its display filter returns invisible text', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One real WordPress archive route covers seven responsive widths.');
  test.setTimeout(180000);
  expect(wp('term', 'get', 'category', '1', '--field=term_id').trim()).toBe('1');
  await fs.mkdir(path.dirname(plugin), { recursive: true });
  await fs.writeFile(plugin, isolatedFilter, { flag: 'wx' });
  try {
    await page.goto('/?cat=1&sf_archive_title_test=1', { waitUntil: 'networkidle' });
    const main = page.locator('main#main-content');
    const header = main.locator('.slateframe-page-header');
    const title = header.locator('h1.slateframe-page-title');
    await expect(title).toHaveText('Category archive');
    await expect(title.locator('bdi')).toHaveText('Category archive');
    await expect(main.locator('.slateframe-grid')).toHaveCount(1);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const state = await header.evaluate(node => ({
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
    const audit = await new AxeBuilder({ page }).include('.slateframe-page-header')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    const skip = page.locator('a.skip-link[href="#main-content"]');
    await skip.focus();
    await skip.press('Enter');
    await expect(main).toBeFocused();

    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.emulateMedia({ forcedColors: 'active' });
    await header.screenshot({ path: 'test-artifacts/screenshots/archive-readable-fallback-390-rtl-400-forced-colors.png', animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await header.screenshot({ path: 'test-artifacts/screenshots/archive-readable-fallback-1440-ltr.png', animations: 'disabled' });

    await page.goto('/?cat=1', { waitUntil: 'networkidle' });
    await expect(page.locator('main h1.slateframe-page-title')).not.toHaveText('Category archive');
  } finally {
    await fs.rm(plugin, { force: true });
  }
});
