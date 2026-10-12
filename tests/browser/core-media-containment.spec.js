const { test, expect } = require('@playwright/test');
test('native Core media remain bounded at seven responsive widths and in RTL', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  const prose = page.locator('.slateframe-prose').first();
  await expect(prose).toBeVisible();
  await prose.evaluate(root => {
    const fixture = document.createElement('section');
    fixture.className = 'slateframe-core-media-fixture';
    fixture.innerHTML = '<figure class="wp-block-audio"><audio controls preload="none" style="width:960px"></audio></figure>' +
      '<figure class="wp-block-embed"><iframe title="Embed" width="960" height="240" src="about:blank"></iframe></figure>' +
      '<figure class="wp-block-embed"><object aria-label="Object media" width="960" height="120"></object></figure>' +
      '<figure class="wp-block-embed"><embed title="Embedded media" width="960" height="120" type="text/plain"></figure>';
    root.append(fixture);
  });
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      const result = await page.locator('.slateframe-core-media-fixture').evaluate(root => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        bounds: [...root.querySelectorAll('audio,iframe,object,embed')].map(node => {
          const rect = node.getBoundingClientRect(), parent = node.parentElement.getBoundingClientRect();
          return { width: rect.width, left: rect.left, right: rect.right, parentLeft: parent.left, parentRight: parent.right };
        }),
      }));
      expect(result.overflow, width + 'px ' + dir + ' overflow').toBeLessThanOrEqual(1);
      expect(result.bounds).toHaveLength(4);
      for (const rect of result.bounds) {
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.left).toBeGreaterThanOrEqual(rect.parentLeft - 1);
        expect(rect.right).toBeLessThanOrEqual(rect.parentRight + 1);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.slateframe-core-media-fixture').screenshot({ path: 'test-artifacts/screenshots/core-media-390-rtl-200-forced-colors.png' });
});
