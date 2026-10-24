const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

test('real WordPress native video/audio attachment captions and responsive Core players', async ({ page }, info) => {
  expect([320, 375, 390, 412, 768, 1440, 1920]).toContain(info.project.use.viewport?.width);
  for (const kind of ['video', 'audio']) {
    const mime = kind === 'video' ? 'video/mp4' : 'audio/mpeg';
    const ext = kind === 'video' ? 'mp4' : 'mp3';
    const filename = 'slateframe-native-' + randomUUID().replaceAll('-', '') + '.' + ext;
    const code = "$upload=wp_upload_dir();$file=trailingslashit($upload['path']).'" + filename +
      "';file_put_contents($file,'Slateframe isolated media fixture');$id=wp_insert_attachment(array(" +
      "'post_title'=>'Slateframe native " + kind + "','post_excerpt'=>'<em>日本語 العربية native caption</em>'," +
      "'post_mime_type'=>'" + mime + "','post_status'=>'inherit','guid'=>trailingslashit($upload['url']).'" +
      filename + "'),$file,0,true);if(is_wp_error($id)){throw new RuntimeException($id->get_error_message());}echo $id;";
    const id = Number(wp('eval', code));
    expect(id).toBeGreaterThan(0);
    try {
      await page.goto('/?attachment_id=' + id, { waitUntil: 'networkidle' });
      await expect(page.locator('.slateframe-entry-title')).toHaveText('Slateframe native ' + kind);
      const figure = page.locator('.slateframe-prose > figure.alignwide').first();
      await expect(figure.locator(kind)).toHaveCount(1);
      await expect(figure.locator('figcaption')).toHaveText('日本語 العربية native caption');
      await expect(page.getByRole('link', { name: 'Open original file' })).toBeVisible();
      await page.addStyleTag({ path: 'rtl.css' });
      for (const width of [info.project.use.viewport.width]) {
        await page.setViewportSize({ width, height: 900 });
        for (const direction of ['ltr', 'rtl']) {
          await page.locator('html').evaluate((root, dir) => { root.dir = dir; }, direction);
          const m = await figure.evaluate(node => {
            const viewport = document.documentElement.clientWidth;
            const rect = node.getBoundingClientRect();
            const media = node.querySelector('video,audio').getBoundingClientRect();
            const wrapper = node.querySelector('.wp-video,.mejs-container')?.getBoundingClientRect();
            return { viewport, overflow: document.documentElement.scrollWidth - viewport,
              left: rect.left, right: rect.right, mediaLeft: media.left, mediaRight: media.right,
              wrapperLeft: wrapper?.left ?? 0, wrapperRight: wrapper?.right ?? 0 };
          });
          expect(m.overflow, kind + ' ' + width + 'px ' + direction).toBeLessThanOrEqual(1);
          expect(m.left).toBeGreaterThanOrEqual(-1);
          expect(m.right).toBeLessThanOrEqual(m.viewport + 1);
          expect(m.mediaLeft).toBeGreaterThanOrEqual(-1);
          expect(m.mediaRight).toBeLessThanOrEqual(m.viewport + 1);
          if (kind === 'video') {
            expect(m.wrapperLeft).toBeGreaterThanOrEqual(-1);
            expect(m.wrapperRight).toBeLessThanOrEqual(m.viewport + 1);
          }
        }
        if ([390, 1440].includes(width)) {
          const dir = path.resolve('test-artifacts/screenshots');
          await fs.mkdir(dir, { recursive: true });
          await page.locator('html').evaluate(root => { root.dir = 'ltr'; });
          await page.screenshot({ path: path.join(dir, 'native-attachment-' + kind + '-' + width + '.png'), fullPage: true });
        }
      }
      await page.setViewportSize({ width: 390, height: 900 });
      await page.locator('html').evaluate(root => { root.dir = 'rtl'; root.style.fontSize = '200%'; });
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, kind + ' 390px RTL 200% forced colors').toBeLessThanOrEqual(1);
      await expect(figure.locator('figcaption')).toBeVisible();
      await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    } finally {
      wp('eval', 'wp_delete_attachment(' + id + ',true);');
    }
  }
});
