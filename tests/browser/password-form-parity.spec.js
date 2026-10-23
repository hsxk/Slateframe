const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

test('Core password form keeps 44px controls without leaking hidden discussion assets', async ({ page }, testInfo) => {
  const protectedPath = process.env.SLATEFRAME_PROTECTED_POST_PATH;
  expect(protectedPath, 'The isolated WordPress fixture must create a protected post').toBeTruthy();
  await page.goto(protectedPath, { waitUntil: 'networkidle' });

  const form = page.locator('form.post-password-form');
  await expect(form).toBeVisible();
  await expect(form.locator('input[type="password"]')).toBeVisible();
  await expect(form.locator('input[type="submit"]')).toBeVisible();
  await expect(page.locator('link[href*="/assets/css/forms.css"]')).toHaveCount(1);
  await expect(page.locator('link[href*="/assets/css/comments.css"]')).toHaveCount(0);
  await expect(page.locator('script[src*="comment-reply"]')).toHaveCount(0);
  await expect(page.locator('.slateframe-comments')).toHaveCount(0);
  await expect(page.getByText('Private fixture content — not rendered without password')).toHaveCount(0);

  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '400%';
  });
  for (const control of [form.locator('input[type="password"]'), form.locator('input[type="submit"]')]) {
    const bounds = await control.boundingBox();
    expect(bounds?.height || 0).toBeGreaterThanOrEqual(44);
    expect(bounds?.x || 0).toBeGreaterThanOrEqual(-1);
    expect((bounds?.x || 0) + (bounds?.width || 0)).toBeLessThanOrEqual(page.viewportSize().width + 1);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await form.locator('input[type="password"]').focus();
  await expect(form.locator('input[type="password"]')).toBeFocused();
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(form.locator('input[type="password"]')).toBeFocused();

  const width = testInfo.project.use.viewport?.width;
  if ([320, 390, 1440].includes(width)) {
    const dir = path.resolve('test-artifacts/screenshots');
    await fs.mkdir(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `core-password-rtl-400-forced-${width}.png`), fullPage: true });
  }
});
