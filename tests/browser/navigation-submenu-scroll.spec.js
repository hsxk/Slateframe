const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const fixture = Array.from({ length: 25 }, (_, i) =>
  `<li><a href="#nested-${i}">International research / 国際出版 ${i + 1}</a></li>`
).join('');

test('long Core navigation submenus remain reachable without viewport overflow', async ({ page }, info) => {
  const width = info.project.use.viewport?.width || 0;
  test.skip(![320, 390, 1440, 1920].includes(width), 'Representative compact and desktop layouts.');
  await page.goto('/', { waitUntil: 'networkidle' });
  const header = page.locator('[data-site-header]');
  const nav = page.locator('[data-primary-nav]');
  await nav.evaluate((node, links) => {
    node.innerHTML = `<ul><li class="menu-item-has-children"><a href="#research">Research</a><ul class="sub-menu">${links}</ul></li><li><a href="#about">About</a></li></ul>`;
  }, fixture);
  const compact = width <= 390;
  const toggle = page.locator('[data-menu-toggle]');
  const submenu = nav.locator('.sub-menu');
  const folder = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(folder, { recursive: true });

  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate((dir) => { document.documentElement.dir = dir; }, direction);
    await expect.poll(() => header.evaluate((node) => node.classList.contains('is-compact'))).toBe(compact);
    if (compact) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    } else {
      await nav.locator(':scope > ul > li > a').first().focus();
    }
    await expect(submenu).toBeVisible();
    const scrollTarget = compact ? nav : submenu;
    const initial = await scrollTarget.evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      bottom: node.getBoundingClientRect().bottom,
      viewport: window.innerHeight,
      overflowY: getComputedStyle(node).overflowY,
    }));
    expect(initial.scrollHeight, direction).toBeGreaterThan(initial.clientHeight);
    expect(initial.bottom, direction).toBeLessThanOrEqual(initial.viewport + 1);
    expect(initial.overflowY).toMatch(/auto|scroll/);

    await submenu.locator('a').nth(23).focus();
    await page.keyboard.press('Tab');
    await expect(submenu.locator('a').last()).toBeFocused();
    const end = await scrollTarget.evaluate((node) => ({
      scrollTop: node.scrollTop,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(end.scrollTop, direction).toBeGreaterThan(0);
    expect(end.documentOverflow, direction).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(folder, `navigation-submenu-${width}-${direction}.png`) });
    if (compact) {
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toBeFocused();
    }
  }
});
