const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';

test('native article navigation preserves intrinsic columns, RTL, zoom and touch targets', async ({ page }, info) => {
  await page.goto(postPath, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const grid = page.locator('.slateframe-post-navigation .nav-links');
  await expect(grid).toBeVisible();

  // Fixture uses real WordPress markup. An end-of-series post can have only
  // one neighbour; test the opposite boundary without adding fake links.
  const links = grid.locator('a');
  expect(await links.count()).toBeGreaterThan(0);
  for (const dir of ['ltr', 'rtl']) {
    await page.locator('html').evaluate((node, value) => { node.dir = value; }, dir);
    for (const zoom of [100, 200]) {
      await page.locator('html').evaluate((node, value) => { node.style.fontSize = value + '%'; }, zoom);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const width = info.project.use.viewport?.width || 1440;
      const columns = await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
      const next = grid.locator('.nav-next');
      if (width <= 640) {
        expect(columns, width + 'px ' + dir + ' ' + zoom + '%').toBe(1);
        if (await next.count()) {
          await expect(next).toHaveCSS('text-align', 'start');
          const cell = await next.evaluate((node) => getComputedStyle(node).gridColumnStart);
          if (await grid.locator('.nav-previous').count() === 0) {
            expect(cell).toBe('auto');
          }
        }
      } else {
        expect(columns).toBe(2);
        if (await next.count() && await grid.locator('.nav-previous').count() === 0) {
          await expect(next).toHaveCSS('grid-column-start', '2');
        }
      }
      for (const link of await links.all()) {
        const rect = await link.boundingBox();
        expect(rect?.height || 0).toBeGreaterThanOrEqual(44);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, width + 'px ' + dir + ' ' + zoom + '% root overflow').toBeLessThanOrEqual(1);
      if (dir === 'ltr' && zoom === 200 && [320, 390, 1440].includes(width)) {
        const dirPath = path.resolve('test-artifacts/screenshots');
        await fs.mkdir(dirPath, { recursive: true });
        await grid.screenshot({ path: path.join(dirPath, 'post-navigation-' + info.project.name + '.png'), animations: 'disabled' });
      }
    }
  }
});
