const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const viewportWidth = (info) => info.project.use.viewport?.width || 1440;
const widths = [320, 390, 1440];

// The theme form can coexist with a Core Search block in a footer widget.
// Each explicit search landmark needs a name, independently of the input label.
test('theme Search and 404 recovery expose a named native search landmark', async ({ page }, info) => {
  test.skip(!widths.includes(viewportWidth(info)), 'Representative mobile and desktop search landmark widths.');
  for (const route of ['/?s=Slateframe', '/slateframe-browser-missing/']) {
    await page.goto(route, { waitUntil: 'networkidle' });
    const form = page.locator('form.slateframe-search-form').first();
    await expect(form).toHaveAttribute('role', 'search');
    const name = (await form.getAttribute('aria-label'))?.trim();
    expect(name?.length || 0, 'Search landmark must have a translated accessible name').toBeGreaterThan(0);
    await expect(page.getByRole('search', { name, exact: true }).first()).toBeVisible();
    const input = form.locator('input[type="search"][name="s"]');
    await expect(input).toHaveAttribute('enterkeyhint', 'search');
    await expect(input).toHaveAttribute('dir', 'auto');
    expect(await input.evaluate((node) => node.labels?.length || 0)).toBeGreaterThan(0);
    await input.focus();
    await expect(input).toBeFocused();
    const submit = form.locator('button[type="submit"]');
    await expect(submit).toBeVisible();
    const rect = await submit.boundingBox();
    expect(rect?.width || 0).toBeGreaterThanOrEqual(44);
    expect(rect?.height || 0).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if (route.startsWith('/?s=') && [390, 1440].includes(viewportWidth(info))) {
      const dir = path.resolve('test-artifacts/screenshots');
      await fs.mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `search-landmark-viewport-${viewportWidth(info)}.png`), fullPage: true });
    }
  }
});

test('keyboard Search submits mixed CJK/RTL text through native GET', async ({ page }, info) => {
  test.skip(!widths.includes(viewportWidth(info)), 'Representative mobile and desktop search keyboard widths.');
  await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });
  const query = 'العربية & 日本語';
  const input = page.locator('.slateframe-search-form input[name="s"]').first();
  await input.fill(query);
  expect(await input.evaluate((node) => getComputedStyle(node).direction)).toBe('rtl');
  await input.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('s')).toBe(query);
  await expect(page.locator('.slateframe-page-title bdi')).toHaveText(query);
  await expect(page.locator('.slateframe-search-form input[name="s"]').first()).toHaveValue(query);
  await page.locator('html').evaluate((node) => node.setAttribute('dir', 'rtl'));
  const searchInput = page.locator('.slateframe-search-form input[name="s"]').first();
  await searchInput.fill('English العربية');
  expect(await searchInput.evaluate((node) => getComputedStyle(node).direction)).toBe('ltr');
});
