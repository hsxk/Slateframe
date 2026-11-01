const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const widths = [320, 375, 390, 412, 768, 1440, 1920];
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const plugin = '/tmp/wp-browser/wp-content/mu-plugins/slateframe-taxonomy-footer-' + process.pid + '.php';
const fixture = [
  '<?php',
  "add_filter( 'slateframe_entry_categories_html', static function ( $html ) {",
  "  $mode = isset( $_GET['sf_taxonomy_footer_test'] ) ? $_GET['sf_taxonomy_footer_test'] : '';",
  "  if ( 'blank' === $mode || 'tag' === $mode ) { return '<a href=\"/category\">&#x200B;</a>'; }",
  "  if ( 'category' === $mode || 'valid' === $mode ) { return '<a href=\"/?cat=1\">分類 العربية</a>'; }",
  '  return $html;',
  '} );',
  "add_filter( 'slateframe_entry_tags_html', static function ( $html ) {",
  "  $mode = isset( $_GET['sf_taxonomy_footer_test'] ) ? $_GET['sf_taxonomy_footer_test'] : '';",
  "  if ( 'blank' === $mode || 'category' === $mode ) { return '<a href=\"/tag\">&#x3164;</a>'; }",
  "  if ( 'tag' === $mode || 'valid' === $mode ) { return '<a href=\"/?tag=sample\">وسم 日本語</a>'; }",
  '  return $html;',
  '} );',
  '',
].join('\n');

test('filtered classic Core taxonomy groups never leave orphaned labels', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One isolated WordPress fixture covers seven widths and both directions.');
  test.setTimeout(180000);
  const slug = 'slateframe-taxonomy-' + randomUUID().slice(0, 12);
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_content=Short article for native taxonomy presentation.', '--porcelain');
    expect(postId).toMatch(/^\d+$/);
    await fs.mkdir(path.dirname(plugin), { recursive: true });
    await fs.writeFile(plugin, fixture, { flag: 'wx' });
    const route = '/?p=' + postId + '&sf_taxonomy_footer_test=';
    const footer = page.locator('.slateframe-entry-footer');

    await page.goto(route + 'valid', { waitUntil: 'networkidle' });
    await expect(footer.locator('a')).toHaveCount(2);
    await expect(footer).toContainText('Filed under');
    await expect(footer).toContainText('Tagged');
    await expect(footer).toContainText('分類 العربية');
    await expect(footer).toContainText('وسم 日本語');

    await page.goto(route + 'blank', { waitUntil: 'networkidle' });
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(footer).toHaveCount(0);
    await expect(page.locator('.slateframe-entry-meta')).toHaveCount(1);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, width + 'px ' + direction + ' ' + font + 'px').toBeLessThanOrEqual(1);
          await expect(footer).toHaveCount(0);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const axe = await new AxeBuilder({ page }).include('main#main-content')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.screenshot({ path: 'test-artifacts/screenshots/taxonomy-readable-390-rtl-400-forced-colors.png', fullPage: true });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await page.screenshot({ path: 'test-artifacts/screenshots/taxonomy-readable-1440-ltr.png', fullPage: true });

    await page.goto(route + 'category', { waitUntil: 'networkidle' });
    await expect(footer.locator('a')).toHaveCount(1);
    await expect(footer).toContainText('Filed under');
    await expect(footer).not.toContainText('Tagged');
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const link = footer.locator('a');
    await link.focus();
    await expect(link).toBeFocused();
    const bounds = await link.boundingBox();
    expect(bounds?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    const axeCategory = await new AxeBuilder({ page }).include('.slateframe-entry-footer')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axeCategory.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    await footer.screenshot({ path: 'test-artifacts/screenshots/taxonomy-readable-category-390-rtl-400-forced-colors.png', animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'none' });

    await page.goto(route + 'tag', { waitUntil: 'networkidle' });
    await expect(footer.locator('a')).toHaveCount(1);
    await expect(footer).not.toContainText('Filed under');
    await expect(footer).toContainText('Tagged');
  } finally {
    await fs.rm(plugin, { force: true });
    if (postId) wp('post', 'delete', postId, '--force');
  }
});
