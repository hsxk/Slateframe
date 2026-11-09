const { test, expect } = require('@playwright/test');

test('native search keeps its labeled input and submit control within the page at responsive widths', async ({ page }) => {
  await page.goto('/?s=slateframe-search-layout-fixture', { waitUntil: 'networkidle' });
  const form = page.locator('.slateframe-search-form').first();
  await expect(form).toBeVisible();
  const field = form.locator('input[name="s"]');
  const submit = form.locator('button[type="submit"]');
  await expect(field).toBeVisible();
  await expect(submit).toBeVisible();
  await expect(field.locator('xpath=parent::label')).toHaveCount(1);
  await page.addStyleTag({ path: 'rtl.css' });

  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const direction of ['ltr', 'rtl']) {
      await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
      const geometry = await form.evaluate(node => {
        const label = node.querySelector('label');
        const input = node.querySelector('input[name="s"]');
        const button = node.querySelector('button[type="submit"]');
        const parent = node.getBoundingClientRect();
        const bounds = element => {
          const rect = element.getBoundingClientRect();
          return rect.left >= parent.left - 1 && rect.right <= parent.right + 1;
        };
        return {
          labelContained: bounds(label),
          inputContained: bounds(input),
          buttonContained: bounds(button),
          buttonHeight: button.getBoundingClientRect().height,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(geometry.labelContained, `${width}px ${direction} label`).toBe(true);
      expect(geometry.inputContained, `${width}px ${direction} input`).toBe(true);
      expect(geometry.buttonContained, `${width}px ${direction} submit`).toBe(true);
      expect(geometry.buttonHeight).toBeGreaterThanOrEqual(44);
      expect(geometry.overflow, `${width}px ${direction} document`).toBeLessThanOrEqual(1);
    }
  }
});

test('native search submits Unicode terms through WordPress GET and preserves the accessible label', async ({ page }) => {
  await page.goto('/?s=slateframe-search-layout-fixture', { waitUntil: 'networkidle' });
  const form = page.locator('.slateframe-search-form').first();
  await expect(form).toBeVisible();
  const field = form.locator('input[name="s"]');
  const submit = form.locator('button[type="submit"]');
  const query = '写真 撮影 العربية 2026';
  await field.fill(query);
  await submit.click();
  await expect(page).toHaveURL(url => new URL(url).searchParams.get('s') === query);
  await expect(page.locator('.slateframe-search-form input[name="s"]').first()).toHaveValue(query);
  await expect(page.locator('.slateframe-search-form label').first()).toContainText('Search for:');
});

test('native search remains keyboard-operable at 200% text zoom in narrow RTL forced-colors mode', async ({ page }) => {
  await page.goto('/?s=slateframe-search-layout-fixture', { waitUntil: 'networkidle' });
  await page.addStyleTag({ path: 'rtl.css' });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '200%';
  });
  await page.emulateMedia({ forcedColors: 'active' });
  const form = page.locator('.slateframe-search-form').first();
  const field = form.locator('input[name="s"]');
  const submit = form.locator('button[type="submit"]');
  await expect(field).toBeVisible();
  await expect(submit).toBeVisible();
  await field.fill('写真 中文 العربية');
  await page.keyboard.press('Tab');
  await expect(submit).toBeFocused();
  const geometry = await form.evaluate(node => {
    const formRect = node.getBoundingClientRect();
    const button = node.querySelector('button[type="submit"]');
    const buttonRect = button.getBoundingClientRect();
    const inputRect = node.querySelector('input[name="s"]').getBoundingClientRect();
    return {
      inputContained: inputRect.left >= formRect.left - 1 && inputRect.right <= formRect.right + 1,
      buttonContained: buttonRect.left >= formRect.left - 1 && buttonRect.right <= formRect.right + 1,
      buttonHeight: buttonRect.height,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      focusVisible: button.matches(':focus-visible'),
      outlineStyle: getComputedStyle(button).outlineStyle,
    };
  });
  expect(geometry.inputContained).toBe(true);
  expect(geometry.buttonContained).toBe(true);
  expect(geometry.buttonHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.focusVisible).toBe(true);
  expect(geometry.outlineStyle).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(url => new URL(url).searchParams.get('s') === '写真 中文 العربية');
});
