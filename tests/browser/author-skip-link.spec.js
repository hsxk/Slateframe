const { test, expect } = require('@playwright/test');

test('author archive keyboard skip link reaches the main landmark', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  let authorUrl = await page.locator('.slateframe-byline a').first().getAttribute('href').catch(() => null);
  if (!authorUrl) {
    const firstPost = page.locator('.slateframe-card-title a').first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();
    authorUrl = await page.locator('.slateframe-byline a').first().getAttribute('href');
  }
  expect(authorUrl).toBeTruthy();
  await page.goto(authorUrl, { waitUntil: 'networkidle' });
  const main = page.locator('main#main-content');
  await expect(main).toHaveCount(1);
  await expect(main).toHaveAttribute('tabindex', '-1');
  const skip = page.locator('a.skip-link[href="#main-content"]');
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  await expect(main).toBeFocused();
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(main).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
