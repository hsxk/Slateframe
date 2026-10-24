const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const fixture = `<form id="slateframe-validation-fixture" aria-label="Native validation presentation">
  <p><label for="sf-untouched">Untouched required field</label><input id="sf-untouched" required></p>
  <p><label for="sf-explicit">Email 中文 العربية</label><input id="sf-explicit" type="email" aria-invalid="true" aria-describedby="sf-error"><span id="sf-error">Please enter a valid email.</span></p>
  <p><label for="sf-typed">Native email</label><input id="sf-typed" type="email" required></p>
  <p><label for="sf-select">Choice</label><select id="sf-select" aria-invalid="true"><option>Choose</option></select></p>
  <p><label for="sf-notes">Notes</label><textarea id="sf-notes" aria-invalid="true">日本語</textarea></p>
  <p><label for="sf-valid">Valid text</label><input id="sf-valid" value="Fine"></p>
</form>`;

test('native user-invalid and aria-invalid form states preserve Core controls', async ({ page }, info) => {
  const width = info.project.use.viewport.width;
  test.skip(![320, 390, 1440].includes(width), 'Representative validation evidence');
  await page.goto('/?s=slateframe-validation-fixture', { waitUntil: 'networkidle' });
  await expect(page.locator('link#slateframe-forms-css')).toHaveCount(1);
  await page.locator('main').first().evaluate((main, html) => {
    const section = document.createElement('section');
    section.className = 'slateframe-shell';
    section.innerHTML = html;
    main.prepend(section);
  }, fixture);
  const read = (selector) => page.locator(selector).evaluate((node) => {
    const s = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    return { border: s.borderTopColor, borderWidth: parseFloat(s.borderTopWidth),
      outline: s.outlineStyle, outlineWidth: parseFloat(s.outlineWidth),
      height: r.height, left: r.left, right: r.right };
  });
  const untouched = await read('#sf-untouched');
  const valid = await read('#sf-valid');
  expect(untouched.borderWidth).toBeLessThan(2);
  expect(valid.borderWidth).toBeLessThan(2);
  for (const selector of ['#sf-explicit', '#sf-select', '#sf-notes']) {
    const s = await read(selector);
    expect(s.borderWidth, selector).toBeGreaterThanOrEqual(2);
    expect(s.border, selector).not.toBe(valid.border);
  }
  await page.locator('#sf-typed').fill('not-an-email');
  await page.locator('#sf-valid').focus();
  await expect.poll(() => page.locator('#sf-typed').evaluate((node) => node.matches(':user-invalid'))).toBe(true);
  expect((await read('#sf-typed')).borderWidth).toBeGreaterThanOrEqual(2);
  for (const direction of ['ltr', 'rtl']) {
    await page.locator('html').evaluate((node, dir) => {
      node.dir = dir;
      node.style.fontSize = '200%';
    }, direction);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.locator('#sf-explicit').focus();
    const focused = await read('#sf-explicit');
    expect(focused.outline).toBe('solid');
    expect(focused.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(focused.borderWidth).toBeGreaterThanOrEqual(2);
    for (const selector of ['#sf-untouched', '#sf-explicit', '#sf-typed', '#sf-select', '#sf-notes', '#sf-valid']) {
      const box = await read(selector);
      expect(box.height, selector).toBeGreaterThanOrEqual(44);
      expect(box.left, selector).toBeGreaterThanOrEqual(-1);
      expect(box.right, selector).toBeLessThanOrEqual(width + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if ([390, 1440].includes(width)) {
      const dir = path.resolve('test-artifacts/screenshots');
      await fs.mkdir(dir, { recursive: true });
      await page.locator('#slateframe-validation-fixture').screenshot({
        path: path.join(dir, 'form-validation-' + direction + '-forced-colors-viewport-' + width + '.png'),
      });
    }
  }
});
