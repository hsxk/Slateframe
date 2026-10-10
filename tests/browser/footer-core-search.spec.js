const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const wp = (php) => execFileSync('wp', ['eval', php, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 20_000,
});

// Change the real WordPress widget settings, not the browser DOM. This also
// validates the theme's pre-enqueue detection for otherwise form-free archives.
const fixtureId = 90817;
const install = `
$widgets = get_option('widget_block', array());
$widgets[${fixtureId}] = array('content' => '<!-- wp:search {"label":"Search","buttonText":"検索 Search 搜索","buttonPosition":"button-outside"} /-->');
update_option('widget_block', $widgets);
$sidebars = wp_get_sidebars_widgets();
$sidebars['footer-content'] = isset($sidebars['footer-content']) ? $sidebars['footer-content'] : array();
if (!in_array('block-${fixtureId}', $sidebars['footer-content'], true)) {
    $sidebars['footer-content'][] = 'block-${fixtureId}';
}
wp_set_sidebars_widgets($sidebars);
`;
const remove = `
$widgets = get_option('widget_block', array());
unset($widgets[${fixtureId}]);
update_option('widget_block', $widgets);
$sidebars = wp_get_sidebars_widgets();
$sidebars['footer-content'] = array_values(array_diff(isset($sidebars['footer-content']) ? $sidebars['footer-content'] : array(), array('block-${fixtureId}')));
wp_set_sidebars_widgets($sidebars);
`;

test('real Core Search footer widget retains controls at 200% zoom', async ({ page }, testInfo) => {
  test.skip(!process.env.CI, 'Needs the CI WordPress CLI fixture');
  wp(install);
  try {
    await page.goto('/', { waitUntil: 'networkidle' });
    // The archive has no form of its own: forms.css must come from the widget.
    await expect(page.locator('link[href*="/assets/css/forms.css"]')).toHaveCount(1);
    const search = page.locator('.slateframe-footer-content .slateframe-footer-widget .wp-block-search').last();
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
    wp(remove);
  }
});
