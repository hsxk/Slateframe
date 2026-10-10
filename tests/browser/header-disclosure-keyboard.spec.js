const { test, expect } = require('@playwright/test');
const width = (info) => info.project.use.viewport?.width || 1440;
for (const direction of ['ltr', 'rtl']) {
 test(`compact navigation follows natural keyboard order (${direction})`, async ({ page }, info) => {
  test.skip(width(info) > 1280);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate((dir) => { document.documentElement.dir = dir; }, direction);
  const menu = page.locator('[data-menu-toggle]'), nav = page.locator('[data-primary-nav]');
  const color = page.locator('[data-color-toggle]'), last = nav.locator('a[href]:visible').last();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).not.toHaveAttribute('inert');
  await last.focus();
  await page.keyboard.press('Tab');
  await expect(color).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(color).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toHaveAttribute('inert', '');
 });
}
test('compact navigation closes when focus leaves the non-modal disclosure', async ({page},info)=>{
 test.skip(width(info)>1280);
 await page.goto('/',{waitUntil:'networkidle'});
 const menu=page.locator('[data-menu-toggle]'),nav=page.locator('[data-primary-nav]');
 await menu.click();
 const skip=page.locator('.skip-link');
 await skip.focus();
 await expect(skip).toBeFocused();
 await expect(menu).toHaveAttribute('aria-expanded','false');
 await expect(nav).toHaveAttribute('inert','');
});
test('compact navigation allows Tab outside header without focus trapping',async({page},info)=>{
 test.skip(width(info)>1280);
 await page.goto('/',{waitUntil:'networkidle'});
 const menu=page.locator('[data-menu-toggle]'),nav=page.locator('[data-primary-nav]');
 await menu.click();
 await menu.focus();
 await page.keyboard.press('Tab');
 await expect(menu).toHaveAttribute('aria-expanded','false');
 const outside=await page.evaluate(()=>!document.querySelector('[data-site-header]').contains(document.activeElement));
 expect(outside).toBe(true);
 await expect(nav).toHaveAttribute('inert','');
});
test('resizing into compact mode restores focus from newly inert navigation',async({page},info)=>{
 test.skip(width(info)!==1920);
 await page.goto('/',{waitUntil:'networkidle'});
 const menu=page.locator('[data-menu-toggle]'),nav=page.locator('[data-primary-nav]');
 await expect(menu).toBeHidden();
 await nav.locator('a[href]:visible').last().focus();
 await page.setViewportSize({width:390,height:844});
 await expect(menu).toBeVisible();
 await expect(nav).toHaveAttribute('inert','');
 await expect(menu).toBeFocused();
});
test('color toggle remains operable in open compact menu',async({page},info)=>{
 test.skip(width(info)>1280);
 await page.goto('/',{waitUntil:'networkidle'});
 const menu=page.locator('[data-menu-toggle]'),color=page.locator('[data-color-toggle]');
 await menu.click();
 const pressed=await color.getAttribute('aria-pressed');
 await color.focus();
 await page.keyboard.press('Enter');
 await expect(color).toHaveAttribute('aria-pressed',pressed==='true'?'false':'true');
 await expect(menu).toHaveAttribute('aria-expanded','true');
});
