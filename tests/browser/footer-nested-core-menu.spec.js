const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('footer preserves WordPress Core three-level menu in RTL and zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable Core menu covers all widths.');
  test.setTimeout(180000);
  const menuId = wp('menu', 'create', 'Slateframe footer hierarchy ' + randomUUID(), '--porcelain');
  try {
    const root = wp('menu', 'item', 'add-custom', menuId, 'Research', '#research', '--porcelain');
    const child = wp('menu', 'item', 'add-custom', menuId, 'Archive / 归档', '#archive',
      '--parent-id=' + root, '--porcelain');
    wp('menu', 'item', 'add-custom', menuId, 'Methodology / 方法 / المنهجية', '#method',
      '--parent-id=' + child);
    wp('menu', 'item', 'add-custom', menuId, 'About', '#about');
    const html = wp('eval', 'echo wp_nav_menu(array("menu" => ' + menuId +
      ', "container" => false, "echo" => false, "depth" => 0, ' +
      '"menu_class" => "slateframe-footer-menu", "fallback_cb" => false));');
    expect(html).toContain('sub-menu');
    expect(html).toContain('Methodology / 方法 / المنهجية');
    await page.goto('/', { waitUntil: 'networkidle' });
    const footer = page.locator('.slateframe-footer-inner');
    await footer.evaluate((node, markup) => {
      let nav = node.querySelector('.slateframe-footer-nav');
      if (!nav) {
        nav = document.createElement('nav');
        nav.className = 'slateframe-footer-nav';
        nav.setAttribute('aria-label', 'Footer navigation');
        node.append(nav);
      }
      nav.innerHTML = markup;
    }, html);
    const nav = footer.locator('.slateframe-footer-nav');
    const links = nav.locator('a');
    await expect(links).toHaveCount(4);
    await expect(nav.locator('ul.sub-menu')).toHaveCount(2);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, direction) => {
          node.dir = direction;
          node.style.fontSize = '16px';
        }, dir);
        for (const link of await links.all()) {
          await expect(link).toBeVisible();
          const rect = await link.boundingBox();
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.x).toBeGreaterThanOrEqual(-1);
          expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth -
          document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '64px'; });
    for (const link of await links.all()) {
      await link.focus();
      await expect(link).toBeFocused();
      const geometry = await link.evaluate(node => {
        const box = node.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(node);
        const fragments = [...range.getClientRects()].map(rect => ({
          left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        }));
        return { x: box.x, right: box.right, height: box.height,
          scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
          fragments };
      });
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.x).toBeGreaterThanOrEqual(-1);
      expect(geometry.right).toBeLessThanOrEqual(391);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
      expect(geometry.fragments.length).toBeGreaterThan(0);
      for (const fragment of geometry.fragments) {
        expect(fragment.left).toBeGreaterThanOrEqual(-1);
        expect(fragment.right).toBeLessThanOrEqual(391);
      }
    }
    await links.first().focus();
    await page.keyboard.press('Tab');
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(links.nth(2)).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth -
      document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const axe = await new AxeBuilder({ page }).include('.slateframe-footer-nav')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.screenshot({ path: 'test-artifacts/screenshots/footer-nested-390-rtl-400.png',
      fullPage: true, animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.last().focus();
    await expect(links.last()).toBeFocused();
    await page.screenshot({ path: 'test-artifacts/screenshots/footer-nested-390-rtl-400-forced-colors.png',
      fullPage: true, animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = '16px'; });
    await nav.screenshot({ path: 'test-artifacts/screenshots/footer-nested-1440-ltr.png',
      animations: 'disabled' });
  } finally {
    wp('menu', 'delete', menuId);
  }
});
