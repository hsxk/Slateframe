const { test, expect } = require('@playwright/test');

test('Core File PDF preview before filename keeps 44px links in frontend and RTL', async ({ page }, info) => {
  test.skip((info.project.use.viewport?.width || 1440) !== 390);
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  await page.addStyleTag({ path: 'rtl.css' });
  await page.locator('.slateframe-prose').first().evaluate(root => {
    const file = document.createElement('div');
    file.className = 'wp-block-file slateframe-preview-fixture';
    const preview = document.createElement('object');
    preview.className = 'wp-block-file__embed';
    preview.type = 'application/pdf';
    preview.style.cssText = 'display:block;inline-size:100%;max-inline-size:100%;block-size:4rem';
    const filename = document.createElement('a');
    filename.href = '#preview-file';
    filename.textContent = '日本語-中文-العربية-' + 'long-filename-'.repeat(15) + '.pdf';
    const download = document.createElement('a');
    download.href = '#preview-file';
    download.className = 'wp-block-file__button wp-element-button';
    download.textContent = 'Download / 下载 / ダウンロード';
    download.setAttribute('download', 'preview.pdf');
    file.append(preview, filename, download);
    root.append(file);
  });
  const file = page.locator('.slateframe-preview-fixture');
  const filename = file.locator('a:first-of-type');
  const download = file.locator('.wp-block-file__button');
  await expect(file.locator('object.wp-block-file__embed')).toHaveCount(1);
  await expect(filename).toHaveAttribute('href', '#preview-file');
  await expect(download).toHaveAttribute('download', 'preview.pdf');
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      const sizes = await file.evaluate(node => {
        const a = node.querySelector('a:first-of-type').getBoundingClientRect();
        const b = node.querySelector('.wp-block-file__button').getBoundingClientRect();
        return {
          filename: { width: a.width, height: a.height },
          download: { width: b.width, height: b.height },
          container: node.getBoundingClientRect().width,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(sizes.filename.height, `${width}px ${dir}`).toBeGreaterThanOrEqual(43);
      expect(sizes.filename.width).toBeGreaterThanOrEqual(43);
      expect(sizes.filename.width).toBeLessThanOrEqual(sizes.container + 1);
      expect(sizes.download.height).toBeGreaterThanOrEqual(43);
      expect(sizes.pageOverflow).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.keyboard.press('Tab');
  for (const link of [filename, download]) {
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  }
  await file.screenshot({ path: 'test-artifacts/screenshots/core-file-preview-390-rtl-200-forced-colors.png' });
});
