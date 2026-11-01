const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { setRootTextScale } = require('./support/root-text-scale');

// Exercise actual WordPress listing and author routes, never a synthetic DOM.
test('listing headings preserve mixed-script isolation across viewport and zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture exercises the matrix');
  test.setTimeout(180000);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.goto('/', { waitUntil: 'networkidle' });
  let authorUrl = await page.locator('.slateframe-byline a').first().getAttribute('href').catch(() => null);
  if (!authorUrl) {
    const firstPost = page.locator('.slateframe-card-title a').first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();
    authorUrl = await page.locator('.slateframe-byline a').first().getAttribute('href');
  }
  expect(authorUrl, 'WordPress must supply a real author archive link').toBeTruthy();
  for (const surface of [
    { route: '/', label: 'index' },
    { route: authorUrl, label: 'author' },
  ]) {
    await page.goto(surface.route, { waitUntil: 'networkidle' });
    const title = page.locator('.slateframe-page-header .slateframe-page-title').first();
    await expect(title, surface.label + ' title').toBeVisible();
    const isolated = title.locator(':scope > bdi');
    await expect(isolated).toHaveCount(1);
    expect(await isolated.evaluate(node => getComputedStyle(node).unicodeBidi)).toBe('isolate');
    await isolated.evaluate(node => {
      node.textContent = '日本語 中文 العربية — ' + 'LongUnbrokenListingName'.repeat(4);
    });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const geometry = await title.evaluate(node => {
            const rect = node.getBoundingClientRect();
            return {
              left: rect.left, right: rect.right,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
          });
          const label = surface.label + ' ' + width + 'px ' + direction + ' ' + font + 'px';
          expect(geometry.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(geometry.left, label + ' left edge').toBeGreaterThanOrEqual(-1);
          expect(geometry.right, label + ' right edge').toBeLessThanOrEqual(width + 1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await title.scrollIntoViewIfNeeded();
    const axe = await new AxeBuilder({ page }).include('.slateframe-page-header')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations, surface.label).toEqual([]);
    await page.screenshot({ path: 'test-artifacts/screenshots/listing-bidi-' + surface.label + '-390-rtl-400.png' });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.screenshot({ path: 'test-artifacts/screenshots/listing-bidi-' + surface.label + '-390-rtl-400-forced-colors.png' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await page.screenshot({ path: 'test-artifacts/screenshots/listing-bidi-' + surface.label + '-1440-ltr.png' });
  }
});

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

test('real WordPress taxonomy archive keeps its Core title and RTL isolation', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable Core taxonomy fixture');
  test.setTimeout(120000);
  const slug = 'slateframe-bidi-' + randomUUID();
  const category = wp('term', 'create', 'category', '日本語 العربية', '--slug=' + slug, '--porcelain');
  let post = null;
  try {
    post = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=Archive listing ' + slug, '--porcelain');
    wp('post', 'term', 'set', post, 'category', category);
    await page.goto('/?cat=' + category, { waitUntil: 'networkidle' });
    const title = page.locator('.slateframe-page-header .slateframe-page-title').first();
    await expect(title).toBeVisible();
    const isolated = title.locator(':scope > bdi');
    await expect(isolated).toHaveCount(1);
    await expect(isolated).toContainText('日本語 العربية');
    expect(await isolated.evaluate(node => getComputedStyle(node).unicodeBidi)).toBe('isolate');
    await isolated.evaluate(node => {
      node.textContent += ' — ' + 'LongUnbrokenArchiveName'.repeat(4);
    });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const font of [16, 64]) {
          await setRootTextScale(page, font, direction);
          const state = await title.evaluate(node => ({
            left: node.getBoundingClientRect().left,
            right: node.getBoundingClientRect().right,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }));
          const label = 'Core archive ' + width + ' ' + direction + ' ' + font;
          expect(state.overflow, label + ' overflow').toBeLessThanOrEqual(1);
          expect(state.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.right, label + ' right').toBeLessThanOrEqual(width + 1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const axe = await new AxeBuilder({ page }).include('.slateframe-page-header')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.screenshot({ path: 'test-artifacts/screenshots/listing-bidi-core-archive-390-rtl-400.png' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setRootTextScale(page, 16, 'ltr');
    await page.screenshot({ path: 'test-artifacts/screenshots/listing-bidi-core-archive-1440-ltr.png' });
  } finally {
    if (post) wp('post', 'delete', post, '--force');
    wp('term', 'delete', 'category', category);
  }
});
