const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const wp = (php) => execFileSync('wp', ['eval', php, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 20_000,
});
const widgetId = 90863;
const install = `
$block = wp_insert_post(array('post_type'=>'wp_block','post_status'=>'publish',
 'post_title'=>'CI footer presentation','post_content'=>'<!-- wp:group {"className":"slateframe-knowledge-checklist"} --><div class="wp-block-group slateframe-knowledge-checklist"><p>Footer knowledge fixture</p></div><!-- /wp:group --><!-- wp:query {"className":"slateframe-project-grid"} /--><!-- wp:html --><div class="slateframe-project-grid"><ul class="wp-block-post-template"><li><a href="/">项目一 — Portfolio project one</a></li><li><a href="/">المشروع الثاني — Project two</a></li></ul></div><!-- /wp:html --><!-- wp:image {"lightbox":{"enabled":true}} --><figure class="wp-block-image"><img src="/wp-content/themes/slateframe/assets/images/pattern-placeholder-landscape.svg" alt="Footer fixture"></figure><!-- /wp:image -->'));
$widgets = get_option('widget_block', array());
$widgets[${widgetId}] = array('content'=>'<!-- wp:block {"ref":'.$block.'} /-->');
update_option('widget_block', $widgets);
$sidebars = wp_get_sidebars_widgets();
$sidebars['footer-content'] = isset($sidebars['footer-content']) ? $sidebars['footer-content'] : array();
if (!in_array('block-${widgetId}', $sidebars['footer-content'], true)) $sidebars['footer-content'][] = 'block-${widgetId}';
wp_set_sidebars_widgets($sidebars);
echo $block;
`;
const remove = (blockId) => `
$widgets = get_option('widget_block', array());
unset($widgets[${widgetId}]);
update_option('widget_block', $widgets);
$sidebars = wp_get_sidebars_widgets();
$sidebars['footer-content'] = array_values(array_diff(isset($sidebars['footer-content']) ? $sidebars['footer-content'] : array(), array('block-${widgetId}')));
wp_set_sidebars_widgets($sidebars);
wp_delete_post(${blockId}, true);
`;

test('active published footer patterns load presentation on archives without reading CSS', async ({ page }, testInfo) => {
  test.skip(!process.env.CI || testInfo.project.name !== 'viewport-1440',
    'Runs once against real WordPress, then checks both 390px and 1440px.');
  const blockId = Number(wp(install).trim());
  expect(blockId).toBeGreaterThan(0);
  try {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto('/', { waitUntil: 'networkidle' });
      for (const handle of ['photography', 'content-modes', 'query-loop']) {
        await expect(page.locator(`link[href*="/assets/css/${handle}.css"]`)).toHaveCount(1);
      }
      await expect(page.locator('link[href*="/assets/css/reading.css"]')).toHaveCount(0);
      await expect(page.locator('.slateframe-footer-content .slateframe-knowledge-checklist')).toBeVisible();
      const footerCards = page.locator('.slateframe-footer-content .wp-block-post-template > li');
      await expect(footerCards).toHaveCount(2);
      const first = await footerCards.nth(0).boundingBox();
      const second = await footerCards.nth(1).boundingBox();
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const directory = path.resolve('test-artifacts/screenshots');
      await fs.mkdir(directory, { recursive: true });
      await page.locator('.slateframe-site-footer').screenshot({
        path: path.join(directory, `footer-presentation-${width}.png`),
      });
      if (width === 390) {
        await page.locator('html').evaluate((node) => {
          node.dir = 'rtl';
          node.style.fontSize = '200%';
        });
        const rtlOverflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(rtlOverflow).toBeLessThanOrEqual(1);
        const link = footerCards.first().locator('a');
        await page.keyboard.press('Tab');
        await link.focus();
        await expect(link).toBeFocused();
        const box = await link.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        await page.emulateMedia({ forcedColors: 'active' });
        expect(await link.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none');
        await page.locator('.slateframe-site-footer').screenshot({
          path: path.join(directory, 'footer-presentation-390-rtl-200-forced-colors.png'),
        });
        await page.emulateMedia({ forcedColors: 'none' });
      }
    }
  } finally {
    wp(remove(blockId));
  }
  await page.goto('/', { waitUntil: 'networkidle' });
  for (const handle of ['photography', 'content-modes', 'query-loop']) {
    await expect(page.locator(`link[href*="/assets/css/${handle}.css"]`)).toHaveCount(0);
  }
});