const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const widths = [320, 375, 390, 412, 768, 1440, 1920];
const plugin = '/tmp/wp-browser/wp-content/mu-plugins/slateframe-menu-front-' + process.pid + '.php';

test('filtered Core page list preserves a Home route when static front is omitted', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One serialized WordPress fixture covers all seven responsive widths.');
  test.setTimeout(180000);
  const slug = 'slateframe-menu-front-' + randomUUID().slice(0, 12);
  const originalShow = wp('option', 'get', 'show_on_front');
  const originalFront = wp('option', 'get', 'page_on_front');
  let frontId;
  let aboutId;
  try {
    frontId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=' + slug + '-front', '--porcelain');
    aboutId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=' + slug + '-about', '--porcelain');
    expect(frontId).toMatch(/^\d+$/);
    expect(aboutId).toMatch(/^\d+$/);
    const filter = [
      '<?php',
      "add_filter( 'wp_list_pages', static function ( $output ) {",
      "  if ( isset( $_GET['sf_menu_front_test'] ) && '1' === $_GET['sf_menu_front_test'] ) {",
      `    return '<li class="page_item page-item-${aboutId}"><a href="' . esc_url( get_permalink( ${aboutId} ) ) . '">About 日本語 العربية</a></li>';`,
      '  }',
      '  return $output;',
      '} );',
      "add_filter( 'pre_wp_nav_menu', static function ( $output, $args ) {",
      "  if ( isset( $_GET['sf_menu_front_test'] ) && '1' === $_GET['sf_menu_front_test'] && is_object( $args ) && isset( $args->theme_location ) && 'primary' === $args->theme_location ) {",
      '    ob_start(); slateframe_menu_fallback(); return ob_get_clean();',
      '  }',
      '  return $output;',
      '}, 10, 2 );',
      '',
    ].join('\n');
    await fs.mkdir(path.dirname(plugin), { recursive: true });
    await fs.writeFile(plugin, filter, { flag: 'wx' });
    wp('option', 'update', 'page_on_front', frontId);
    wp('option', 'update', 'show_on_front', 'page');
    await page.goto('/?sf_menu_front_test=1', { waitUntil: 'networkidle' });
    const nav = page.locator('nav#slateframe-navigation');
    const list = nav.locator('ul.slateframe-menu-fallback');
    const home = list.locator(':scope > li.slateframe-home-link > a');
    await expect(home).toHaveCount(1);
    await expect(home).toHaveAttribute('aria-current', 'page');
    await expect(list.locator('a')).toHaveCount(2);
    await expect(list.locator('a').last()).toHaveText('About 日本語 العربية');
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, `${width}px ${direction} ${font}px overflow`).toBeLessThanOrEqual(1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await page.locator('[data-menu-toggle]').click();
    await expect(home).toBeVisible();
    const hitTarget = await home.boundingBox();
    expect(hitTarget.width).toBeGreaterThanOrEqual(44);
    expect(hitTarget.height).toBeGreaterThanOrEqual(44);
    await home.focus();
    await expect(home).toBeFocused();
    const audit = await new AxeBuilder({ page }).include('#slateframe-navigation')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.emulateMedia({ forcedColors: 'active' });
    await nav.screenshot({ path: 'test-artifacts/screenshots/menu-front-recovery-390-rtl-400-forced-colors.png', animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await nav.screenshot({ path: 'test-artifacts/screenshots/menu-front-recovery-1440-ltr.png', animations: 'disabled' });
  } finally {
    wp('option', 'update', 'show_on_front', originalShow);
    wp('option', 'update', 'page_on_front', originalFront);
    await fs.rm(plugin, { force: true });
    if (frontId) wp('post', 'delete', frontId, '--force');
    if (aboutId) wp('post', 'delete', aboutId, '--force');
  }
});
