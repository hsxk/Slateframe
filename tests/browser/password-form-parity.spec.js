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

test('Core password submission keeps discussion private until unlock and restores native comments', async ({ page }) => {
  const protectedPath = process.env.SLATEFRAME_PROTECTED_POST_PATH;
  expect(protectedPath, 'The isolated WordPress fixture must create a protected post').toBeTruthy();
  await page.goto(protectedPath, { waitUntil: 'networkidle' });

  const passwordForm = page.locator('form.post-password-form');
  const privateContent = page.getByText('Private fixture content — not rendered without password');
  const comments = page.locator('.slateframe-comments');

  await expect(passwordForm).toBeVisible();
  await expect(privateContent).toHaveCount(0);
  await expect(comments).toHaveCount(0);

  // A rejected password must not reveal the content or enqueue discussion assets.
  await passwordForm.locator('input[type="password"]').fill('incorrect-slateframe-fixture');
  await passwordForm.locator('input[type="submit"]').click();
  await expect(passwordForm).toBeVisible();
  await expect(privateContent).toHaveCount(0);
  await expect(comments).toHaveCount(0);
  await expect(page.locator('link[href*="/assets/css/comments.css"]')).toHaveCount(0);

  // Let WordPress Core set and validate its own postpass cookie and redirect.
  await passwordForm.locator('input[type="password"]').fill('slateframe-ci');
  await passwordForm.locator('input[type="submit"]').click();
  await expect(privateContent).toBeVisible();
  await expect(passwordForm).toHaveCount(0);
  await expect(comments).toBeVisible();
  await expect(page.locator('link[href*="/assets/css/forms.css"]')).toHaveCount(1);
  await expect(page.locator('link[href*="/assets/css/comments.css"]')).toHaveCount(1);
  await expect(comments.locator('form.comment-form')).toBeVisible();

  // Core's cookie should survive a fresh document navigation in this context.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(privateContent).toBeVisible();
  await expect(passwordForm).toHaveCount(0);
  await expect(comments).toBeVisible();
});


test('protected authored presentation stays unloaded until WordPress Core unlocks it', async ({ page }) => {
  const protectedPath = process.env.SLATEFRAME_PROTECTED_PRESENTATION_PATH;
  expect(protectedPath, 'The isolated WordPress fixture must create a protected presentation post').toBeTruthy();
  await page.goto(protectedPath, { waitUntil: 'networkidle' });
  const passwordForm = page.locator('form.post-password-form');
  const hiddenCopy = page.getByText('Private visual fixture — hidden until unlocked');
  const privateStyles = ['photography', 'content-modes', 'query-loop', 'form-content'];
  await expect(passwordForm).toBeVisible();
  await expect(hiddenCopy).toHaveCount(0);
  await expect(page.locator('link[href*="/assets/css/forms.css"]')).toHaveCount(1);
  for (const style of privateStyles) {
    await expect(page.locator('link[href*="/assets/css/' + style + '.css"]'), style + ' must not reveal locked authored presentation').toHaveCount(0);
  }
  await passwordForm.locator('input[type="password"]').fill('slateframe-ci-presentation');
  await passwordForm.locator('input[type="submit"]').click();
  await expect(hiddenCopy).toBeVisible();
  await expect(passwordForm).toHaveCount(0);
  for (const style of privateStyles) {
    await expect(page.locator('link[href*="/assets/css/' + style + '.css"]'), style + ' must return after Core unlocks the post').toHaveCount(1);
  }
  await page.reload({ waitUntil: 'networkidle' });
  await expect(hiddenCopy).toBeVisible();
});
