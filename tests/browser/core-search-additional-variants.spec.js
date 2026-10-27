const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

// Structural Core-shaped fixtures; Core's button-only reveal JS and Gutenberg
// saved-block validity require separate WordPress/editor acceptance.
test('Core Search no-button and button-only remain accessible at 400% text', async ({ page }, info) => {
  const width = info.project.use.viewport?.width || 1440;
  await page.goto('/?s=Portable', { waitUntil: 'load' });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) throw new Error('WordPress main landmark missing');
    const host = document.createElement('section');
    host.className = 'slateframe-extra-search-test';
    host.innerHTML = '<form role="search" class="wp-block-search wp-block-search__no-button">' +
      '<label for="extra-search">Search</label><div class="wp-block-search__inside-wrapper">' +
      '<input id="extra-search" class="wp-block-search__input" name="s" type="search" value="portable"></div></form>' +
      '<form role="search" class="wp-block-search wp-block-search__button-only">' +
      '<button class="wp-block-search__button" type="button" aria-label="Search articles">Search articles</button></form>';
    main.prepend(host);
  });
  for (const direction of ['ltr', 'rtl']) {
    for (const font of [16, 32, 64]) {
      await setRootTextScale(page, font, direction);
      for (const selector of ['#extra-search', '.slateframe-extra-search-test button']) {
        const control = page.locator(selector);
        const metrics = await control.evaluate(node => {
          const rect = node.getBoundingClientRect();
          const parent = node.closest('form').getBoundingClientRect();
          return { width: rect.width, height: rect.height, form: parent.width,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        });
        const label = width + 'px ' + direction + ' ' + font + 'px ' + selector;
        expect(metrics.height, label).toBeGreaterThanOrEqual(44);
        expect(metrics.width, label).toBeGreaterThan(0);
        expect(metrics.width, label).toBeLessThanOrEqual(metrics.form + 1);
        expect(metrics.overflow, label).toBeLessThanOrEqual(1);
        await control.focus();
        await expect(control, label).toBeFocused();
      }
      if (font === 64 && width === 390) {
        await fs.mkdir('test-artifacts/screenshots', { recursive: true });
        await page.locator('.slateframe-extra-search-test').screenshot({
          path: 'test-artifacts/screenshots/core-search-extra-390-' + direction + '-400.png',
        });
      }
    }
  }
  expect(await page.locator('.slateframe-extra-search-test form').first().evaluate(node => new FormData(node).get('s'))).toBe('portable');
  await expect(page.locator('.slateframe-extra-search-test button')).toHaveAccessibleName('Search articles');
  if (![320, 390, 768, 1440, 1920].includes(width)) return;
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await setRootTextScale(page, 64, 'rtl');
  for (const selector of ['#extra-search', '.slateframe-extra-search-test button']) {
    const control = page.locator(selector);
    await control.focus();
    expect(await control.evaluate(node => node.matches(':focus-visible'))).toBe(true);
    expect(await control.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  }
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.locator('.slateframe-extra-search-test').screenshot({
    path: 'test-artifacts/screenshots/core-search-extra-' + width + '-rtl-400-forced-colors.png'
  });
});
