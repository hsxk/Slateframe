const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH;
const width = info => info.project.use.viewport?.width || 1440;

test('native Core Code and Preformatted wrap long tokens with keyboard focus', async ({ page }, info) => {
  test.skip(!showcasePath, 'Requires the real WordPress showcase.');
  await page.goto(showcasePath, { waitUntil: 'networkidle' });
  await page.addStyleTag({ path: 'rtl.css' });
  const region = page.locator('.browser-core-code-reading');
  const code = region.locator('pre.wp-block-code');
  const pre = region.locator('pre.wp-block-preformatted');
  await expect(code).toHaveCount(1);
  await expect(pre).toHaveCount(1);
  await expect(code.locator('code')).toHaveCount(1);
  for (const dir of ['ltr', 'rtl']) {
    await page.evaluate(direction => { document.documentElement.dir = direction; }, dir);
    for (const block of [code, pre]) {
      await expect(block).toHaveAttribute('tabindex', '0');
      await block.focus();
      await expect(block).toBeFocused();
      const metrics = await block.evaluate(node => {
        const rect = node.getBoundingClientRect();
        const parent = node.parentElement.getBoundingClientRect();
        const text = node.matches('.wp-block-code') ? node.querySelector('code') : node;
        return {
          whiteSpace: getComputedStyle(text).whiteSpace,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          left: rect.left, right: rect.right,
          parentLeft: parent.left, parentRight: parent.right,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(metrics.whiteSpace).not.toBe('pre');
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
      expect(metrics.left).toBeGreaterThanOrEqual(metrics.parentLeft - 1);
      expect(metrics.right).toBeLessThanOrEqual(metrics.parentRight + 1);
      expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
    }
  }
  if ([390, 1440].includes(width(info))) {
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.style.fontSize = '200%';
    });
    await page.emulateMedia({ forcedColors: 'active' });
    for (const block of [code, pre]) {
      const metrics = await block.evaluate(node => {
        const box = node.getBoundingClientRect();
        return {
          left: box.left, right: box.right,
          viewport: document.documentElement.clientWidth,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(metrics.overflow).toBeLessThanOrEqual(1);
      expect(metrics.left).toBeGreaterThanOrEqual(-1);
      expect(metrics.right).toBeLessThanOrEqual(metrics.viewport + 1);
    }
    const folder = path.resolve('test-artifacts/screenshots');
    await fs.mkdir(folder, { recursive: true });
    await region.screenshot({ path: path.join(folder, `core-code-wrap-viewport-${width(info)}-rtl-200-forced-colors.png`) });
  }
});
