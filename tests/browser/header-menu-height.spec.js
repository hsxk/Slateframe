const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

test('long compact navigation stays scrollable at 200% text zoom', async ({ page }, info) => {
  const width = info.project.use.viewport?.width || 1440;
  test.skip(width > 412, 'Only compact mobile navigation is affected.');
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
    const list = document.querySelector('[data-primary-nav] ul');
    if (!list) throw new Error('Expected a native navigation list');
    for (let index = 0; index < 18; index++) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#main-content';
      link.textContent = `Navigation reference ${index + 1} 日本語 العربية`;
      li.append(link);
      list.append(li);
    }
  });
  const menu = page.locator('[data-menu-toggle]');
  const nav = page.locator('[data-primary-nav]');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).not.toHaveAttribute('inert');
  const geometry = await nav.evaluate(node => {
    const box = node.getBoundingClientRect();
    return {
      top: box.top, bottom: box.bottom,
      viewport: document.documentElement.clientHeight,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollable: node.scrollHeight > node.clientHeight + 2,
      gutter: getComputedStyle(node).scrollbarGutter,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
  expect(geometry.scrollable).toBe(true);
  expect(geometry.gutter).toBe('stable');
  const last = nav.locator('a[href]').last();
  await last.focus();
  await expect(last).toBeFocused();
  await expect.poll(() => nav.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await page.emulateMedia({ forcedColors: 'active' });
  if ([320, 390].includes(width)) {
    const folder = path.resolve('test-artifacts/screenshots');
    await fs.mkdir(folder, { recursive: true });
    await nav.screenshot({ path: path.join(folder, `compact-nav-viewport-${width}-200-forced-colors.png`) });
  }
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toHaveAttribute('inert', '');
});
