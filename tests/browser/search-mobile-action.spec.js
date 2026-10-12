const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

// Check the theme-owned classic form and WordPress Core Search together.
test('classic and Core Search retain bounded full-width mobile actions', async ({ page }, testInfo) => {
  await page.goto('/?s=Portable', { waitUntil: 'networkidle' });
  const classic = page.locator('.slateframe-search-form').first();
  await expect(classic).toBeVisible();
  await page.locator('.slateframe-page-header .slateframe-shell').evaluate(root => {
    const form = document.createElement('form');
    form.className = 'wp-block-search wp-block-search__button-outside slateframe-core-search-mobile-fixture';
    form.method = 'get';
    form.action = '/';
    form.setAttribute('role', 'search');
    form.innerHTML = '<div class="wp-block-search__inside-wrapper"><input class="wp-block-search__input" type="search" name="s" aria-label="Search published material"><button class="wp-block-search__button wp-element-button" type="submit">Search</button></div>';
    root.append(form);
  });
  const core = page.locator('.slateframe-core-search-mobile-fixture');
  const forms = [classic, core];
  const buttons = forms.map(form => form.locator('button[type=submit]'));
  const inputs = forms.map(form => form.locator('input[type=search]'));
  for (const form of forms) {
    await expect(form).toHaveAttribute('method', 'get');
    expect(await form.evaluate(node => new FormData(node).has('s'))).toBe(true);
  }
  for (const viewport of [320, 375, 390, 412, 640, 768, 1440, 1920]) {
    await page.setViewportSize({ width: viewport, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      for (const button of buttons) {
        const bounds = await button.evaluate(node => {
          const parent = node.closest('.slateframe-search-form,.wp-block-search__inside-wrapper');
          const a = node.getBoundingClientRect();
          const b = parent.getBoundingClientRect();
          return {
            width: a.width, height: a.height, parentWidth: b.width,
            left: a.left, right: a.right, parentLeft: b.left, parentRight: b.right,
            parentDisplay: getComputedStyle(parent).display,
          };
        });
        expect(bounds.height, viewport + 'px ' + dir + ' action height').toBeGreaterThanOrEqual(43);
        expect(bounds.width).toBeGreaterThanOrEqual(43);
        expect(bounds.left).toBeGreaterThanOrEqual(bounds.parentLeft - 1);
        expect(bounds.right).toBeLessThanOrEqual(bounds.parentRight + 1);
        if (viewport <= 640) {
          expect(bounds.parentDisplay).toBe('grid');
          expect(bounds.width, viewport + 'px ' + dir + ' full-width action').toBeGreaterThanOrEqual(bounds.parentWidth - 1);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), viewport + 'px ' + dir + ' page overflow').toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '200%';
  });
  for (const button of buttons) {
    await button.evaluate(node => { node.textContent = '搜索 検索 بحث ' + 'long-localized-action-'.repeat(8); });
    const sizes = await button.evaluate(node => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
      parentWidth: node.closest('.slateframe-search-form,.wp-block-search__inside-wrapper').getBoundingClientRect().width,
    }));
    expect(sizes.width).toBeGreaterThanOrEqual(sizes.parentWidth - 1);
    expect(sizes.height).toBeGreaterThanOrEqual(43);
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await page.keyboard.press('Tab');
  for (const target of [...inputs, ...buttons]) {
    await target.focus();
    await expect(target).toBeFocused();
    expect(await target.evaluate(node => node.matches(':focus-visible'))).toBe(true);
    expect(await target.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await classic.screenshot({ path: 'test-artifacts/screenshots/search-classic-390-rtl-200-forced-colors-' + testInfo.project.name + '.png' });
  await core.screenshot({ path: 'test-artifacts/screenshots/search-core-390-rtl-200-forced-colors-' + testInfo.project.name + '.png' });
});
