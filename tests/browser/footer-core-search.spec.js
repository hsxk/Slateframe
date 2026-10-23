const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { footerWidgetId, footerWidgetMutation } = require('./support/footer-widget-fixture');

const wp = (php) => execFileSync('wp', ['eval', php, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 20_000,
});

// Change the real WordPress widget settings, not the browser DOM. This also
// validates the theme's pre-enqueue detection for otherwise form-free archives.
test('real Core Search footer widget retains controls at 200% zoom', async ({ page }, testInfo) => {
  test.skip(!process.env.CI, 'Needs the CI WordPress CLI fixture');
  const fixtureId = footerWidgetId(testInfo.project.name);
  wp(footerWidgetMutation(fixtureId, 'install'));
  try {
    await page.goto('/', { waitUntil: 'networkidle' });
    // The archive has no form of its own: forms.css must come from the widget.
    await expect(page.locator('link[href*="/assets/css/forms.css"]')).toHaveCount(1);
    const search = page.locator(`.slateframe-footer-content #block-${fixtureId} .wp-block-search`);
    await expect(search).toHaveCount(1);
    await expect(search).toBeVisible();
    const input = search.locator('input[type=search]');
    const button = search.locator('button[type=submit]');
    await page.locator('html').evaluate((node) => { node.style.fontSize = '200%'; });
    for (const direction of ['ltr', 'rtl']) {
      await page.locator('html').evaluate((node, dir) => { node.dir = dir; }, direction);
      await expect(input).toBeVisible();
      await expect(button).toBeVisible();
      const metrics = await search.evaluate((node) => {
        const inner = node.querySelector('.wp-block-search__inside-wrapper');
        const input = node.querySelector('input');
        const button = node.querySelector('button');
        const rect = (element) => element.getBoundingClientRect();
        const bounds = rect(node);
        return {
          layout: getComputedStyle(inner).display,
          marginStart: parseFloat(getComputedStyle(button).marginInlineStart) || 0,
          minimumControl: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')) || 44,
          input: { left: rect(input).left, right: rect(input).right, width: rect(input).width, height: rect(input).height },
          button: { left: rect(button).left, right: rect(button).right, height: rect(button).height },
          widget: { left: bounds.left, right: bounds.right },
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      const width = testInfo.project.use.viewport?.width || 1440;
      if (width <= 640) {
        expect(metrics.layout).toBe('grid');
        expect(metrics.marginStart).toBeLessThanOrEqual(1);
        expect(metrics.input.width).toBeGreaterThanOrEqual(metrics.widget.right - metrics.widget.left - 2);
      }
      for (const control of [metrics.input, metrics.button]) {
        expect(control.height).toBeGreaterThanOrEqual(metrics.minimumControl - 1);
        expect(control.left).toBeGreaterThanOrEqual(metrics.widget.left - 1);
        expect(control.right).toBeLessThanOrEqual(metrics.widget.right + 1);
      }
      expect(metrics.overflow).toBeLessThanOrEqual(1);
      await input.focus();
      await page.keyboard.press('Tab');
      await expect(button).toBeFocused();
      await page.emulateMedia({ forcedColors: 'active' });
      expect(await button.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none');
      await page.emulateMedia({ forcedColors: 'none' });
      if (direction === 'rtl' && [320, 390, 1440].includes(width)) {
        const dir = path.resolve('test-artifacts/screenshots');
        await fs.mkdir(dir, { recursive: true });
        await search.screenshot({ path: path.join(dir, `footer-core-search-rtl-200-${testInfo.project.name}.png`) });
      }
    }
  } finally {
    wp(footerWidgetMutation(fixtureId, 'remove'));
  }
});
