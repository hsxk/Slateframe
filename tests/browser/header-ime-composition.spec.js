const { test, expect } = require('@playwright/test');

const width = info => info.project.use.viewport?.width || 1440;

for (const dir of ['ltr', 'rtl']) {
  test(`IME Escape does not dismiss compact navigation (${dir})`, async ({ page }, info) => {
    test.skip(width(info) > 1280);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(value => { document.documentElement.dir = value; }, dir);
    const toggle = page.locator('[data-menu-toggle]');
    const nav = page.locator('[data-primary-nav]');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).not.toHaveAttribute('inert');

    const composition = await page.evaluate(() => {
      const active = document.activeElement;
      const event = new KeyboardEvent('keydown', {
        key: 'Escape', isComposing: true, bubbles: true, cancelable: true,
      });
      const dispatched = active.dispatchEvent(event);
      return { composing: event.isComposing, prevented: event.defaultPrevented, dispatched };
    });
    expect(composition.composing).toBe(true);
    expect(composition.prevented).toBe(false);
    expect(composition.dispatched).toBe(true);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).not.toHaveAttribute('inert');

    const legacy = await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      Object.defineProperty(event, 'keyCode', { value: 229 });
      document.activeElement.dispatchEvent(event);
      return { keyCode: event.keyCode, prevented: event.defaultPrevented };
    });
    expect(legacy.keyCode).toBe(229);
    expect(legacy.prevented).toBe(false);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).not.toHaveAttribute('inert');

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toHaveAttribute('inert', '');
    await expect(toggle).toBeFocused();
  });
}

test('already handled Escape does not steal navigation state', async ({ page }, info) => {
  test.skip(width(info) > 1280);
  await page.goto('/', { waitUntil: 'networkidle' });
  const toggle = page.locator('[data-menu-toggle]');
  const nav = page.locator('[data-primary-nav]');
  await toggle.click();
  const prevented = await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    event.preventDefault();
    document.activeElement.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).not.toHaveAttribute('inert');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});
