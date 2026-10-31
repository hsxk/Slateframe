const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

const evidence = {
  post: { mobile: 'synced-comments-post-390-rtl-400.png', desktop: 'synced-comments-post-1440-ltr.png' },
  page: { mobile: 'synced-comments-page-390-rtl-400.png', desktop: 'synced-comments-page-1440-ltr.png' },
  attachment: { mobile: 'synced-comments-attachment-390-rtl-400.png', desktop: 'synced-comments-attachment-1440-ltr.png' },
};

test('published synced Core discussion owns post, page and attachment forms', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390,
    'One disposable real WordPress fixture covers all seven responsive widths.');
  test.setTimeout(180000);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const ids = [];
  let attachmentId = 0;
  let patternId = 0;
  try {
    patternId = Number(wp('post', 'create', '--post_type=wp_block', '--post_status=publish',
      '--post_title=Slateframe synced discussion ' + suffix,
      '--post_content=<!-- wp:post-comments-form /-->', '--porcelain'));
    expect(patternId).toBeGreaterThan(0);
    const content = '<!-- wp:block {"ref":' + patternId + '} /-->';
    for (const type of ['post', 'page']) {
      const id = Number(wp('post', 'create', '--post_type=' + type, '--post_status=publish',
        '--comment_status=open', '--post_title=Slateframe synced ' + type + ' ' + suffix,
        '--post_content=' + content, '--porcelain'));
      expect(id).toBeGreaterThan(0);
      ids.push({ type, id, url: type === 'post' ? '/?p=' + id : '/?page_id=' + id });
    }
    const filename = 'slateframe-synced-' + suffix + '.txt';
    const php = '$upload=wp_upload_dir();$file=trailingslashit($upload["path"])."' + filename + '";' +
      'file_put_contents($file,"Slateframe fixture");' +
      '$id=wp_insert_attachment(array("post_title"=>"Slateframe synced attachment",' +
      '"post_mime_type"=>"text/plain","post_status"=>"inherit","comment_status"=>"open",' +
      '"post_content"=>\'' + content + '\',"guid"=>trailingslashit($upload["url"])."' + filename +
      '"),$file,0,true);if(is_wp_error($id)){throw new RuntimeException($id->get_error_message());}echo $id;';
    attachmentId = Number(wp('eval', php));
    expect(attachmentId).toBeGreaterThan(0);
    ids.push({ type: 'attachment', id: attachmentId, url: '/?attachment_id=' + attachmentId });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const fixture of ids) {
      await page.goto(fixture.url, { waitUntil: 'networkidle' });
      const native = page.locator('.wp-block-post-comments-form');
      await expect(native, fixture.type).toHaveCount(1);
      await expect(page.locator('form#commentform')).toHaveCount(1);
      await expect(page.locator('.slateframe-comments')).toHaveCount(0);
      for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const dir of ['ltr', 'rtl']) {
          await page.locator('html').evaluate((root, value) => {
            root.dir = value; root.style.fontSize = '16px';
          }, dir);
          const bounds = await native.evaluate(node => {
            const box = node.getBoundingClientRect();
            return { left: box.left, right: box.right,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          expect(bounds.overflow, fixture.type + ' ' + width + ' ' + dir).toBeLessThanOrEqual(1);
          expect(bounds.left).toBeGreaterThanOrEqual(-1);
          expect(bounds.right).toBeLessThanOrEqual(width + 1);
        }
      }
      await page.setViewportSize({ width: 390, height: 900 });
      await page.locator('html').evaluate(root => { root.dir = 'rtl'; root.style.fontSize = '64px'; });
      const submit = native.locator('button#submit');
      await expect(submit).toHaveCount(1);
      expect(await submit.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      const a11y = await new AxeBuilder({ page }).include('.wp-block-post-comments-form')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(a11y.violations).toEqual([]);
      await page.screenshot({
        path: 'test-artifacts/screenshots/' + evidence[fixture.type].mobile,
        animations: 'disabled', fullPage: true,
      });
      if (fixture.type === 'attachment') {
        await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
        await page.screenshot({
          path: 'test-artifacts/screenshots/synced-comments-attachment-390-rtl-400-forced-colors.png',
          animations: 'disabled', fullPage: true,
        });
        await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('html').evaluate(root => { root.dir = 'ltr'; root.style.fontSize = '16px'; });
      await native.screenshot({
        path: 'test-artifacts/screenshots/' + evidence[fixture.type].desktop,
        animations: 'disabled',
      });
    }
  } finally {
    if (attachmentId) wp('eval', 'wp_delete_attachment(' + attachmentId + ',true);');
    for (const fixture of ids.filter(item => item.type !== 'attachment')) {
      wp('post', 'delete', String(fixture.id), '--force');
    }
    if (patternId) wp('post', 'delete', String(patternId), '--force');
  }
});
