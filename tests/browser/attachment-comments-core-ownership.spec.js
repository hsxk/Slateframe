const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('authored attachment Core comments own the form without classic duplication', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390,
    'One disposable real WordPress attachment pair covers all responsive widths.');
  test.setTimeout(180000);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const createAttachment = (withCore) => {
    const filename = 'slateframe-comments-' + suffix + (withCore ? '-core' : '-classic') + '.txt';
    const content = withCore ? '<!-- wp:post-comments-form /-->' : 'Ordinary attachment without Core discussion';
    const php = "$upload=wp_upload_dir();$file=trailingslashit($upload['path']).'" + filename +
      "';file_put_contents($file,'Slateframe fixture');" +
      "$id=wp_insert_attachment(array('post_title'=>'Slateframe comments " + (withCore ? 'Core' : 'classic') +
      "','post_mime_type'=>'text/plain','post_status'=>'inherit','comment_status'=>'open'," +
      "'post_content'=>'" + content + "','guid'=>trailingslashit($upload['url']).'" + filename +
      "'),$file,0,true);if(is_wp_error($id)){throw new RuntimeException($id->get_error_message());}echo $id;";
    return Number(wp('eval', php));
  };
  let coreId = 0;
  let classicId = 0;
  try {
    coreId = createAttachment(true);
    classicId = createAttachment(false);
    expect(coreId).toBeGreaterThan(0);
    expect(classicId).toBeGreaterThan(0);
    await page.goto('/?attachment_id=' + coreId, { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-entry-title')).toHaveText('Slateframe comments Core');
    const native = page.locator('.wp-block-post-comments-form');
    await expect(native).toHaveCount(1);
    await expect(page.locator('form#commentform')).toHaveCount(1);
    await expect(page.locator('.slateframe-comments')).toHaveCount(0);
    const submit = native.locator('button#submit');
    await expect(submit).toHaveCount(1);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((root, dir) => {
          root.dir = dir;
          root.style.fontSize = '16px';
        }, direction);
        const bounds = await native.evaluate(node => ({
          left: node.getBoundingClientRect().left,
          right: node.getBoundingClientRect().right,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          formCount: document.querySelectorAll('form#commentform').length,
        }));
        expect(bounds.formCount, width + ' ' + direction).toBe(1);
        expect(bounds.overflow, width + ' ' + direction).toBeLessThanOrEqual(1);
        expect(bounds.left).toBeGreaterThanOrEqual(-1);
        expect(bounds.right).toBeLessThanOrEqual(width + 1);
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(root => { root.dir = 'rtl'; root.style.fontSize = '64px'; });
    const geometry = await submit.evaluate(node => {
      const box = node.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      return {
        height: box.height,
        left: box.left,
        right: box.right,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        textOverflow: node.scrollWidth - node.clientWidth,
        textInside: [...range.getClientRects()].every(line =>
          line.left >= box.left - 1 && line.right <= box.right + 1),
      };
    });
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.textOverflow).toBeLessThanOrEqual(1);
    expect(geometry.textInside).toBe(true);
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(391);
    const textarea = native.locator('textarea#comment');
    await textarea.focus();
    await expect(textarea).toBeFocused();
    const a11y = await new AxeBuilder({ page }).include('.wp-block-post-comments-form')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    await page.screenshot({
      path: 'test-artifacts/screenshots/attachment-comments-core-390-rtl-400.png',
      animations: 'disabled', fullPage: true,
    });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.screenshot({
      path: 'test-artifacts/screenshots/attachment-comments-core-390-rtl-400-forced-colors.png',
      animations: 'disabled', fullPage: true,
    });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(root => { root.dir = 'ltr'; root.style.fontSize = '16px'; });
    await native.screenshot({
      path: 'test-artifacts/screenshots/attachment-comments-core-1440-ltr.png',
      animations: 'disabled',
    });

    await page.goto('/?attachment_id=' + classicId, { waitUntil: 'networkidle' });
    await expect(page.locator('.slateframe-comments')).toHaveCount(1);
    await expect(page.locator('form#commentform')).toHaveCount(1);
    await expect(page.locator('.wp-block-post-comments-form')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(root => { root.dir = 'rtl'; root.style.fontSize = '16px'; });
    await page.locator('.slateframe-comments').screenshot({
      path: 'test-artifacts/screenshots/attachment-comments-classic-390-rtl.png',
      animations: 'disabled',
    });
    wp('post', 'update', String(coreId), '--comment_status=closed');
    await page.goto('/?attachment_id=' + coreId, { waitUntil: 'networkidle' });
    await expect(page.locator('form#commentform')).toHaveCount(0);
    await expect(page.locator('.slateframe-comments')).toHaveCount(0);
  } finally {
    if (coreId) wp('eval', 'wp_delete_attachment(' + coreId + ',true);');
    if (classicId) wp('eval', 'wp_delete_attachment(' + classicId + ',true);');
  }
});
