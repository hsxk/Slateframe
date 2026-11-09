const { test, expect } = require('@playwright/test');

test('native search keeps its labeled input and submit control within the page at responsive widths', async ({ page }) => {
  await page.goto('/?s=slateframe-search-layout-fixture', { waitUntil: 'networkidle' });
  const form = page.locator('.slateframe-search-form').first();
  await expect(form).toBeVisible();
  const field = form.locator('input[name="s"]');
  const submit = form.locator('button[type="submit"]');
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute('inputmode', 'search');
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

test('native search preserves uncommitted Japanese IME text until composition ends', async ({ page }) => {
  await page.goto('/?s=slateframe-search-layout-fixture', { waitUntil: 'networkidle' });
  const field = page.locator('.slateframe-search-form input[name="s"]').first();
  await field.focus();
  await field.evaluate(input => {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    input.value = 'しゃしん';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: 'しゃしん', isComposing: true }));
  });
  await expect(field).toHaveValue('しゃしん');
  await expect(page).toHaveURL(url => new URL(url).searchParams.get('s') === 'slateframe-search-layout-fixture');
  await field.evaluate(input => {
    input.value = '写真';
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '写真' }));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '写真' }));
  });
  await expect(field).toHaveValue('写真');
  await page.locator('.slateframe-search-form button[type="submit"]').first().click();
  await expect(page).toHaveURL(url => new URL(url).searchParams.get('s') === '写真');
});

test('native search submits a committed CJK query with Enter from the input in narrow RTL layout', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/?s=slateframe-search-layout-fixture', { waitUntil: 'networkidle' });
  await page.addStyleTag({ path: 'rtl.css' });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  const field = page.locator('.slateframe-search-form input[name="s"]').first();
  await expect(field).toBeVisible();
  await field.fill('写真 中文 العربية');
  await field.press('Enter');
  await expect(page).toHaveURL(url => new URL(url).searchParams.get('s') === '写真 中文 العربية');
  await expect(page.locator('.slateframe-search-form input[name="s"]').first()).toHaveValue('写真 中文 العربية');
});
