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
const plugin = '/tmp/wp-browser/wp-content/mu-plugins/slateframe-card-thumbnail-' + process.pid + '.php';
const fixture = [
  '<?php',
  "add_filter( 'post_thumbnail_html', static function ( $html ) {",
  "  if ( isset( $_GET['sf_card_empty'] ) ) { return ''; }",
  "  if ( isset( $_GET['sf_card_fragment'] ) ) { return '<img src=\"#photo\" alt=\"Unusable\">'; }",
  "  if ( isset( $_GET['sf_card_missing_alt'] ) ) {",
  "    $tags = new WP_HTML_Tag_Processor( $html );",
  "    if ( $tags->next_tag( 'img' ) ) { $tags->remove_attribute( 'alt' ); return $tags->get_updated_html(); }",
  "  }",
  '  return $html;',
  '} );',
].join('\n');

// The real WordPress template, not a browser-injected stand-in, owns every card.
test('Core listing cards omit filtered broken thumbnails but retain accessible titles', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One disposable WordPress fixture checks all seven widths and both directions.');
  test.setTimeout(180000);
  const slug = 'slateframe-card-' + randomUUID().slice(0, 12);
  let postId;
  let attachmentId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_content=Card image regression.', '--porcelain');
    expect(postId).toMatch(/^\d+$/);
    const screenshot = wp('eval', 'echo get_template_directory()."/screenshot.png";');
    attachmentId = wp('media', 'import', screenshot, '--post_id=' + postId, '--porcelain');
    expect(attachmentId).toMatch(/^\d+$/);
    wp('post', 'meta', 'update', postId, '_thumbnail_id', attachmentId);
    await fs.mkdir(path.dirname(plugin), { recursive: true });
    await fs.writeFile(plugin, fixture, { flag: 'wx' });
    const search = '/?s=' + encodeURIComponent(slug);
    await page.goto(search + '&sf_card_empty=1', { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-card')).toHaveCount(1);
    await expect(page.locator('.slateframe-card-media')).toHaveCount(0);
    await expect(page.locator('.slateframe-card-title a')).toContainText(slug);
    await page.goto(search + '&sf_card_fragment=1', { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-card-media')).toHaveCount(0);
    await expect(page.locator('.slateframe-card-title a')).toContainText(slug);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, width + 'px ' + direction + ' ' + font + 'px').toBeLessThanOrEqual(1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await page.emulateMedia({ forcedColors: 'active' });
    const axe = await new AxeBuilder({ page }).include('main#main-content')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.screenshot({ path: 'test-artifacts/screenshots/card-filtered-thumbnail-390-rtl-400-forced-colors.png', fullPage: true });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.goto(search + '&sf_card_missing_alt=1', { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-card-media img')).toHaveAttribute('alt', '');
    await expect(page.locator('.slateframe-card-title a')).toContainText(slug);
    await page.goto(search, { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-card-media img')).toHaveAttribute('src', /.+/);
  } finally {
    await fs.rm(plugin, { force: true });
    if (attachmentId) wp('post', 'delete', attachmentId, '--force');
    if (postId) wp('post', 'delete', postId, '--force');
  }
});
