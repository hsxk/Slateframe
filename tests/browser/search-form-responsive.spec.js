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
