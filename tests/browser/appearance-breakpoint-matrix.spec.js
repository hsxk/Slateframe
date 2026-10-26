const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const profileName = process.env.SLATEFRAME_APPEARANCE_PROFILE || 'default';
const controls = { compact: 44, default: 44, spacious: 56 };
const control = controls[profileName];
const screenshotDir = path.resolve('test-artifacts/screenshots');

test('Appearance keeps controls, RTL/CJK and layout within seven breakpoints', async ({ page }, info) => {
  if (!control) throw new Error('Unknown Appearance profile: ' + profileName);
  test.setTimeout(90_000);
  const width = info.project.use.viewport.width;
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-site-header]')).toBeVisible();
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('.slateframe-site-footer')).toBeVisible();
  const state = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const header = document.querySelector('[data-site-header]').getBoundingClientRect();
    const footer = document.querySelector('.slateframe-site-footer').getBoundingClientRect();
    return {
      control: Number.parseFloat(root.getPropertyValue('--slateframe-control')),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerLeft: header.left, headerRight: header.right,
      footerLeft: footer.left, footerRight: footer.right,
    };
  });
  expect(state.control).toBe(control);
  expect(state.overflow, 'LTR overflow at ' + width).toBeLessThanOrEqual(1);
  for (const key of ['headerLeft', 'footerLeft']) expect(state[key], key).toBeGreaterThanOrEqual(-1);
  for (const key of ['headerRight', 'footerRight']) expect(state[key], key).toBeLessThanOrEqual(width + 1);

  const header = page.locator('[data-site-header]');
  const compact = await header.evaluate(node => node.classList.contains('is-compact'));
  if (width <= 1280) expect(compact).toBe(true);
  const menuTarget = compact ? page.locator('[data-menu-toggle]') : page.locator('[data-primary-nav] a:visible').first();
  const colorTarget = page.locator('[data-color-toggle]');
  for (const target of [menuTarget, colorTarget]) {
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(control - 1);
    expect(box.height).toBeGreaterThanOrEqual(control - 1);
    await target.focus();
    await expect(target).toBeFocused();
  }
  if (compact) {
    await menuTarget.focus();
    await page.keyboard.press('Enter');
    await expect(menuTarget).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(menuTarget).toHaveAttribute('aria-expanded', 'false');
    await expect(menuTarget).toBeFocused();
  }
  await fs.mkdir(screenshotDir, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDir, 'appearance-breakpoints-' + profileName + '-' + width + '-ltr.png'),
    animations: 'disabled',
  });

  await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
  await page.locator('.slateframe-brand-title').evaluate(node => {
    node.textContent = 'Slateframe 日本語 中文 العربية';
  });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const rtl = await page.evaluate(() => {
    const html = document.documentElement;
    const header = document.querySelector('[data-site-header]').getBoundingClientRect();
    const title = document.querySelector('.slateframe-brand-title').getBoundingClientRect();
    const footer = document.querySelector('.slateframe-site-footer').getBoundingClientRect();
    return {
      dir: getComputedStyle(html).direction, overflow: html.scrollWidth - html.clientWidth,
      headerLeft: header.left, headerRight: header.right,
      titleLeft: title.left, titleRight: title.right,
      footerLeft: footer.left, footerRight: footer.right,
    };
  });
  expect(rtl.dir).toBe('rtl');
  expect(rtl.overflow, 'RTL 200% overflow at ' + width).toBeLessThanOrEqual(1);
  for (const key of ['headerLeft', 'titleLeft', 'footerLeft']) expect(rtl[key], key).toBeGreaterThanOrEqual(-1);
  for (const key of ['headerRight', 'titleRight', 'footerRight']) expect(rtl[key], key).toBeLessThanOrEqual(width + 1);
  await expect(colorTarget).toBeVisible();
  const toggleBox = await colorTarget.boundingBox();
  expect(toggleBox.width).toBeGreaterThanOrEqual(control - 1);
  expect(toggleBox.height).toBeGreaterThanOrEqual(control - 1);
  await colorTarget.focus();
  await expect(colorTarget).toBeFocused();
  await page.screenshot({
    path: path.join(screenshotDir, 'appearance-breakpoints-' + profileName + '-' + width + '-rtl-200-forced-colors.png'),
    animations: 'disabled',
  });
});
