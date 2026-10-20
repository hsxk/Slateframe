const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const postPath = process.env.SLATEFRAME_POST_PATH;
const viewport = (info) => Number(info.project.name.replace('viewport-', ''));

test('closed Core Details are printable without changing reading state', async ({ page }, info) => {
  expect(postPath, 'CI must publish a real WordPress article').toBeTruthy();
  await page.goto(postPath, { waitUntil: 'networkidle' });
  await expect(page.locator('article.slateframe-entry > .slateframe-prose')).toBeVisible();
  await page.locator('article.slateframe-entry > .slateframe-prose').evaluate((prose) => {
    prose.insertAdjacentHTML('beforeend', [
      '<details class="wp-block-details print-closed"><summary>詳細 / 说明 / التفاصيل</summary>',
      '<p class="print-closed-body">Print-only evidence: 日本語 中文 العربية.</p>',
      '<details class="print-nested"><summary>Nested disclosure</summary><p class="print-nested-body">Nested print evidence</p></details></details>',
      '<details class="wp-block-details print-open" open><summary>Already open</summary>',
      '<p class="print-open-body">Keep author state</p></details>',
    ].join(''));
  });
  const closed = page.locator('.print-closed');
  const nested = page.locator('.print-nested');
  const opened = page.locator('.print-open');
  await expect(page.locator('.print-closed-body')).toBeHidden();
  await expect(page.locator('.print-nested-body')).toBeHidden();
  await expect(page.locator('.print-open-body')).toBeVisible();

  if (viewport(info) <= 412) {
    await page.locator('html').evaluate((html) => {
      html.dir = 'rtl';
      html.style.fontSize = '200%';
    });
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
  }
  await page.emulateMedia({ media: 'print' });
  // Emulation alone does not fire native beforeprint; dispatch the same lifecycle event.
  await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.print-closed-body')).toBeVisible();
  await expect(page.locator('.print-nested-body')).toBeVisible();
  await expect(page.locator('.print-open-body')).toBeVisible();
  await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.print-nested-body')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  if ([320, 390, 1440].includes(viewport(info))) {
    const dir = path.resolve('test-artifacts/screenshots');
    await fs.mkdir(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `print-closed-details-${info.project.name}.png`), fullPage: true });
  }

  // Return to screen media before checking the native afterprint lifecycle.
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await expect(page.locator('.print-closed-body')).toBeHidden();
  await expect(page.locator('.print-nested-body')).toBeHidden();
  await expect(page.locator('.print-open-body')).toBeVisible();
  expect(await closed.evaluate((el) => el.open)).toBe(false);
  expect(await nested.evaluate((el) => el.open)).toBe(false);
  expect(await opened.evaluate((el) => el.open)).toBe(true);
  // A second print session must work after the first cleanup.
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.print-nested-body')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await expect(page.locator('.print-nested-body')).toBeHidden();
  expect(await closed.evaluate((el) => el.open)).toBe(false);
});
