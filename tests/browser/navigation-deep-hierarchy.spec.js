const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

// Build a real, disposable WordPress menu without changing the site's menu
// assignments or competing with other Playwright fixtures.
test('Core Walker preserves third-level links, keyboard order and responsive bounds', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One isolated Core menu fixture covers all widths.');
  test.setTimeout(180000);
  const menuId = wp('menu', 'create', 'Slateframe deep navigation ' + randomUUID(), '--porcelain');
  try {
    const research = wp('menu', 'item', 'add-custom', menuId, 'Research', '#research', '--porcelain');
    const archive = wp('menu', 'item', 'add-custom', menuId, 'Archive / 归档',
      '#archive', '--parent-id=' + research, '--porcelain');
    wp('menu', 'item', 'add-custom', menuId, 'Methodology / 方法 / المنهجية',
      '#method', '--parent-id=' + archive);
    wp('menu', 'item', 'add-custom', menuId, 'Contact', '#contact',
      '--parent-id=' + research);
    wp('menu', 'item', 'add-custom', menuId, 'About', '#about');
    const menuHtml = wp('eval', 'echo wp_nav_menu(array("menu" => ' + menuId +
      ', "container" => false, "echo" => false, "depth" => 0, "fallback_cb" => false));');
    expect(menuHtml).toContain('menu-item-has-children');
    expect(menuHtml).toContain('sub-menu');
    expect(menuHtml).toContain('Methodology / 方法 / المنهجية');
    await page.goto('/', { waitUntil: 'networkidle' });
    const nav = page.locator('[data-primary-nav]');
    const header = page.locator('[data-site-header]');
    const toggle = page.locator('[data-menu-toggle]');
    // The HTML comes from the actual WP Core Walker, not a hand-authored DOM facsimile.
    await nav.evaluate((node, html) => { node.innerHTML = html; }, menuHtml);
    const top = nav.locator('a[href="#research"]');
    const second = nav.locator('a[href="#archive"]');
    const third = nav.locator('a[href="#method"]');
    await expect(third).toHaveCount(1);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
        const compact = width <= 1280;
        await expect.poll(() => header.evaluate(node => node.classList.contains('is-compact')))
          .toBe(compact);
        if (compact) {
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        } else {
          await top.focus();
        }
        await expect(second).toBeVisible();
        await expect(third).toBeVisible();
        await second.focus();
        await page.keyboard.press('Tab');
        await expect(third).toBeFocused();
        const bounds = await third.evaluate(node => {
          const rect = node.getBoundingClientRect();
          const root = document.documentElement;
          return { left: rect.left, right: rect.right, height: rect.height,
            overflow: root.scrollWidth - root.clientWidth, viewport: root.clientWidth };
        });
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.left).toBeGreaterThanOrEqual(-1);
        expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
        expect(bounds.overflow).toBeLessThanOrEqual(1);
        await page.screenshot({
          path: path.join('test-artifacts/screenshots', 'navigation-deep-' + width +
            '-' + direction + '.png'),
          animations: 'disabled',
        });
        if (width === 390 && direction === 'rtl') {
          const a11y = await new AxeBuilder({ page }).include('[data-primary-nav]')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          expect(a11y.violations).toEqual([]);
          await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
          await expect(third).toBeFocused();
          await page.screenshot({
            path: path.join('test-artifacts/screenshots', 'navigation-deep-390-rtl-forced-colors.png'),
            animations: 'disabled',
          });
          await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
        }
        if (compact) {
          await page.keyboard.press('Escape');
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        }
      }
    }
  } finally {
    wp('menu', 'delete', menuId);
  }
});
