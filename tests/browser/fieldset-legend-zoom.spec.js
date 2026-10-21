const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

test('native fieldset legend retains readable RTL/CJK words at 400% text size', async ({ page }, info) => {
  const width = Number(info.project.name.replace('viewport-', ''));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main').first()).toBeVisible();
  await page.addStyleTag({ url: '/wp-content/themes/slateframe/assets/css/form-content.css' });
  await page.locator('main').first().evaluate((main) => {
    const section = document.createElement('section');
    section.className = 'slateframe-shell';
    section.innerHTML = '<form id="slateframe-legend-zoom"><fieldset><legend>日本語中文 العربية – form controls</legend><p><label for="slateframe-legend-input">Name</label><input id="slateframe-legend-input"></p></fieldset></form>';
    main.prepend(section);
  });
  const form = page.locator('#slateframe-legend-zoom');
  for (const direction of ['ltr', 'rtl']) {
    for (const fontSize of [16, 32, 64]) {
      await page.evaluate(({ direction, fontSize }) => {
        document.documentElement.dir = direction;
        document.documentElement.style.fontSize = fontSize + 'px';
      }, { direction, fontSize });
      const result = await form.locator('legend').evaluate((legend) => {
        const node = legend.firstChild;
        const start = node.textContent.indexOf('controls');
        const lines = new Set();
        for (let i = start; i < start + 'controls'.length; i++) {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          lines.add(Math.round(range.getBoundingClientRect().top));
        }
        return {
          wordLines: lines.size,
          padding: parseFloat(getComputedStyle(legend).paddingInlineStart),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(result.padding).toBeLessThanOrEqual(4);
      expect(result.overflow, width + 'px ' + direction + ' ' + fontSize + 'px').toBeLessThanOrEqual(1);
      // At 320px/400%, long words may be wider than the available line.
      // Keep them visible instead of shrinking text or clipping the form.
      if (width >= 375) expect(result.wordLines, width + 'px ' + direction + ': no orphan character').toBe(1);
    }
  }
  if (![320, 390, 1440].includes(width)) return;
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '64px';
  });
  await form.locator('input').focus();
  await expect(form.locator('input')).toBeFocused();
  const folder = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(folder, { recursive: true });
  await form.screenshot({ path: path.join(folder, 'fieldset-legend-rtl-400-' + width + '.png') });
});
