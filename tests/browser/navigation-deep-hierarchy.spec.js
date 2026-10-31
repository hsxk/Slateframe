const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

// Exercise WordPress's native menu class structure without replacing the theme's menu JS.
test('third-level menu links remain visible, keyboard reachable and bounded in LTR/RTL', async ({ page }, info) => {
  const width = info.project.use.viewport?.width;
  test.skip(![320, 375, 390, 412, 768, 1440, 1920].includes(width));
  await page.goto('/', { waitUntil: 'networkidle' });
  const nav = page.locator('[data-primary-nav]');
  const header = page.locator('[data-site-header]');
  const toggle = page.locator('[data-menu-toggle]');
  await nav.evaluate(node => {
    node.innerHTML = `<ul class="menu">
      <li class="menu-item menu-item-has-children"><a href="#research">Research</a>
        <ul class="sub-menu">
          <li class="menu-item menu-item-has-children"><a href="#archive">Archive / 归档</a>
            <ul class="sub-menu"><li class="menu-item"><a href="#method">Methodology / 方法 / المنهجية</a></li></ul>
          </li>
          <li class="menu-item"><a href="#contact">Contact</a></li>
        </ul>
      </li>
      <li class="menu-item"><a href="#about">About</a></li>
    </ul>`;
  });
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  const compact = width <= 1280;
  const top = nav.locator('a[href="#research"]');
  const second = nav.locator('a[href="#archive"]');
  const third = nav.locator('a[href="#method"]');
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
    await expect.poll(() => header.evaluate(node => node.classList.contains('is-compact'))).toBe(compact);
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
      path: path.join('test-artifacts/screenshots', `navigation-deep-${width}-${direction}.png`),
      animations: 'disabled',
    });
    if (width === 390 && direction === 'rtl') {
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
});
