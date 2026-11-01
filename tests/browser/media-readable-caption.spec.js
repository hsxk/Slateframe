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
const plugin = '/tmp/wp-browser/wp-content/mu-plugins/slateframe-media-readable-' + process.pid + '.php';
const fixture = [
  '<?php',
  "add_filter( 'slateframe_attachment_details', static function ( $details ) {",
  "  if ( ! isset( $_GET['sf_media_readable'] ) ) { return $details; }",
  "  return array( '&#x200B;' => 'Invisible label', 'Hidden value' => '&#x3164;',",
  "    '日本語 العربية' => '写真 1200 × 900', 'File type' => 'image/png' );",
  '} );',
].join('\n');

test('Core media captions and attachment metadata have readable labels at all widths', async ({ page }, info) => {
  test.skip(!process.env.CI || info.project.use.viewport?.width !== 390,
    'One isolated WordPress fixture covers seven widths and both directions.');
  test.setTimeout(180000);
  const slug = 'slateframe-media-readable-' + randomUUID().slice(0, 12);
  let postId;
  let attachmentId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_content=Native image caption test.', '--porcelain');
    expect(postId).toMatch(/^\d+$/);
    const screenshot = wp('eval', 'echo get_template_directory()."/screenshot.png";');
    attachmentId = wp('media', 'import', screenshot, '--post_id=' + postId, '--porcelain');
    expect(attachmentId).toMatch(/^\d+$/);
    wp('post', 'meta', 'update', postId, '_thumbnail_id', attachmentId);
    await fs.mkdir(path.dirname(plugin), { recursive: true });
    await fs.writeFile(plugin, fixture, { flag: 'wx' });
    const attachmentUrl = '/?attachment_id=' + attachmentId + '&sf_media_readable=1';
    const heroUrl = '/?p=' + postId;
    const invisible = '&#x200B;';
    wp('post', 'update', attachmentId, '--post_excerpt=' + invisible);

    await page.goto(attachmentUrl, { waitUntil: 'networkidle' });
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.slateframe-prose > figure.alignwide img')).toBeVisible();
    await expect(page.locator('.slateframe-prose > figure.alignwide figcaption')).toHaveCount(0);
    const labels = page.locator('.slateframe-entry-footer-label');
    await expect(labels).toHaveCount(2);
    await expect(page.locator('.slateframe-entry-footer')).toContainText('日本語 العربية');
    await expect(page.locator('.slateframe-entry-footer')).toContainText('写真 1200 × 900');
    await expect(page.locator('.slateframe-entry-footer')).not.toContainText('Invisible label');
    await expect(page.locator('.slateframe-entry-footer')).not.toContainText('Hidden value');
    await page.goto(heroUrl, { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-entry-hero img')).toBeVisible();
    await expect(page.locator('.slateframe-entry-hero figcaption')).toHaveCount(0);

    const visibleCaption = '写真の説明 日本語 العربية';
    wp('post', 'update', attachmentId, '--post_excerpt=' + visibleCaption);
    await page.goto(heroUrl, { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-entry-hero figcaption')).toHaveText(visibleCaption);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await page.emulateMedia({ forcedColors: 'active' });
    await page.screenshot({ path: 'test-artifacts/screenshots/media-readable-hero-390-rtl-400-forced-colors.png', fullPage: true });
    await page.emulateMedia({ forcedColors: 'none' });

    await page.goto(attachmentUrl, { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-prose > figure.alignwide figcaption')).toHaveText(visibleCaption);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, width + 'px ' + direction + ' ' + font + 'px').toBeLessThanOrEqual(1);
          await expect(labels).toHaveCount(2);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const fileLink = page.getByRole('link', { name: 'Open original file' });
    await fileLink.focus();
    await expect(fileLink).toBeFocused();
    const bounds = await fileLink.boundingBox();
    expect(bounds?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(44);
    const axe = await new AxeBuilder({ page }).include('main#main-content')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.screenshot({ path: 'test-artifacts/screenshots/media-readable-attachment-390-rtl-400-forced-colors.png', fullPage: true });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await page.screenshot({ path: 'test-artifacts/screenshots/media-readable-attachment-1440-ltr.png', fullPage: true });
  } finally {
    await fs.rm(plugin, { force: true });
    if (attachmentId) wp('eval', 'wp_delete_attachment(' + Number(attachmentId) + ',true);');
    if (postId) wp('post', 'delete', postId, '--force');
  }
});
