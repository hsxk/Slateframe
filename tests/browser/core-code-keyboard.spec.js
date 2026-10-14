const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH;
const width = info => info.project.use.viewport?.width || 1440;

test('real Core Code and Preformatted scroll with keyboard in LTR and RTL', async ({ page }, info) => {
  test.skip(!showcasePath, 'Requires a published real-WordPress showcase.');
  await page.goto(showcasePath, { waitUntil: 'networkidle' });
  const region = page.locator('.browser-core-code-reading');
  await expect(region).toBeVisible();
  const code = region.locator('pre.wp-block-code');
  const pre = region.locator('pre.wp-block-preformatted');
  await expect(code).toHaveCount(1);
  await expect(pre).toHaveCount(1);
  await expect(code.locator('code')).toHaveCount(1);
  for (const block of [code, pre]) {
    await expect(block).toHaveAttribute('tabindex', '0');
  }
  for (const dir of ['ltr', 'rtl']) {
    await page.evaluate(direction => { document.documentElement.dir = direction; }, dir);
    for (const block of [code, pre]) {
      const before = await block.evaluate(node => {
        node.scrollLeft = 0;
        const rect = node.getBoundingClientRect();
        const parent = node.parentElement.getBoundingClientRect();
        return {
          overflow: getComputedStyle(node).overflowX,
          scrollable: node.scrollWidth > node.clientWidth + 2,
          left: rect.left, right: rect.right,
          parentLeft: parent.left, parentRight: parent.right,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(before.overflow).toBe('auto');
      expect(before.scrollable).toBe(true);
      expect(before.left).toBeGreaterThanOrEqual(before.parentLeft - 1);
      expect(before.right).toBeLessThanOrEqual(before.parentRight + 1);
      expect(before.pageOverflow).toBeLessThanOrEqual(1);
      await block.focus();
      await expect(block).toBeFocused();
      await page.keyboard.press(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
      await expect.poll(() => block.evaluate(node => Math.abs(node.scrollLeft))).toBeGreaterThan(0);
    }
  }
  if ([390, 1440].includes(width(info))) {
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.style.fontSize = '200%';
    });
    await page.emulateMedia({ forcedColors: 'active' });
    for (const block of [code, pre]) {
      const box = await block.evaluate(node => {
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left, right: rect.right,
          viewport: document.documentElement.clientWidth,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(box.overflow).toBeLessThanOrEqual(1);
      expect(box.left).toBeGreaterThanOrEqual(-1);
      expect(box.right).toBeLessThanOrEqual(box.viewport + 1);
    }
    await code.focus();
    const folder = path.resolve('test-artifacts/screenshots');
    await fs.mkdir(folder, { recursive: true });
    await code.screenshot({ path: path.join(folder, `core-code-viewport-${width(info)}-rtl-200-forced-colors.png`) });
  }
});
