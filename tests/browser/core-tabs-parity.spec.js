const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const longLabel = '日本語 中文 العربية ' + 'UnbrokenNativeTabLabel'.repeat(4);
const content = '<!-- wp:group {"className":"slateframe-core-tabs-fixture"} -->' +
  '<div class="wp-block-group slateframe-core-tabs-fixture">' +
  '<!-- wp:tabs --><div class="wp-block-tabs">' +
  '<!-- wp:tab-list --><div role="tablist" class="wp-block-tab-list">' +
  '<button type="button" role="tab">' + longLabel + '</button>' +
  '<button type="button" role="tab">Second / 次へ / التالي</button>' +
  '</div><!-- /wp:tab-list -->' +
  '<!-- wp:tab-panels --><div class="wp-block-tab-panels">' +
  '<!-- wp:tab-panel {"label":' + JSON.stringify(longLabel) + '} --><section role="tabpanel" tabindex="0" class="wp-block-tab-panel">' +
  '<!-- wp:paragraph --><p>First native panel / 第一部分</p><!-- /wp:paragraph -->' +
  '</section><!-- /wp:tab-panel -->' +
  '<!-- wp:tab-panel {"label":"Second / 次へ / التالي"} --><section role="tabpanel" tabindex="0" class="wp-block-tab-panel">' +
  '<!-- wp:paragraph --><p>Second native panel / 第二部分</p><!-- /wp:paragraph -->' +
  '</section><!-- /wp:tab-panel -->' +
  '</div><!-- /wp:tab-panels --></div><!-- /wp:tabs -->' +
  '</div><!-- /wp:group -->';

test('native WordPress 7.1 Tabs preserve 44px controls, reflow and keyboard behavior', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture resized across seven widths');
  test.setTimeout(120000);
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Tabs presentation', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const tabs = page.locator('.slateframe-core-tabs-fixture .wp-block-tabs').first();
    await expect(tabs).toBeVisible();
    const buttons = tabs.getByRole('tab');
    await expect(buttons).toHaveCount(2);
    // Core hides inactive panels with hidden="until-found"; keep them in the structural assertion.
    await expect(tabs.getByRole('tabpanel', { includeHidden: true })).toHaveCount(2);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir;
            node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const metrics = await tabs.evaluate(node => ({
            viewport: document.documentElement.clientWidth,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
            control: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')),
            buttons: [...node.querySelectorAll('[role="tab"]')].map(button => {
              const rect = button.getBoundingClientRect();
              return { left: rect.left, right: rect.right, width: rect.width, height: rect.height,
                wrap: getComputedStyle(button).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.rootFont, label + ' computed root font').toBeCloseTo(font, 1);
          expect(metrics.overflow, label + ' document horizontal overflow').toBeLessThanOrEqual(1);
          expect(metrics.control, label + ' bounded token').toBeGreaterThanOrEqual(44);
          expect(metrics.buttons).toHaveLength(2);
          for (const button of metrics.buttons) {
            expect(button.width, label + ' width').toBeGreaterThanOrEqual(44);
            expect(button.height, label + ' height').toBeGreaterThanOrEqual(44);
            expect(button.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(button.right, label + ' right').toBeLessThanOrEqual(metrics.viewport + 1);
            expect(button.wrap, label + ' CJK/RTL wrapping').toBe('anywhere');
          }
          if (width === 390 && font === 64) {
            await fs.mkdir('test-artifacts/screenshots', { recursive: true });
            await buttons.first().scrollIntoViewIfNeeded();
            await expect(buttons.first()).toBeInViewport();
            await page.screenshot({
              path: 'test-artifacts/screenshots/core-tabs-390-' + dir + '-400.png',
              animations: 'disabled',
            });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = '32px'; });
    await buttons.first().focus();
    await expect(buttons.first()).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(buttons.nth(1)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(buttons.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.getByRole('tabpanel', { includeHidden: true }).nth(1)).toBeVisible();
    const axe = await new AxeBuilder({ page }).include('.slateframe-core-tabs-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '64px'; });
    const first = page.locator('.slateframe-core-tabs-fixture [role="tab"]').first();
    await first.focus();
    await expect(first).toBeFocused();
    await first.scrollIntoViewIfNeeded();
    await expect(first).toBeInViewport();
    expect(await first.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.screenshot({
      path: 'test-artifacts/screenshots/core-tabs-390-rtl-400-forced-colors.png',
      animations: 'disabled',
    });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
