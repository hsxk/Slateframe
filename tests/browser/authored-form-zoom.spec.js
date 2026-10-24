const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const path = require('node:path');

const fixture = `<form id="slateframe-authored-form-reflow" aria-label="Native form reflow verification">
  <fieldset><legend>日本語中文 العربية – form controls</legend><p><label for="sf-author-name">Name</label><input id="sf-author-name" type="text"></p></fieldset>
  <div class="slateframe-form-actions" style="gap:12px;max-width:100%">
    <input type="checkbox" aria-label="Consent"><input type="radio" name="choice" aria-label="Choice"><input type="range" aria-label="Level">
    <button id="sf-save" type="button">保存并继续 / Save changes</button><button id="sf-reset" type="reset">Reset</button>
  </div></form>`;

test('authored form actions wrap at 400% zoom without clipping or losing keyboard access', async ({ page }, info) => {
  const width = Number(info.project.name.replace('viewport-', ''));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main').first()).toBeVisible();
  // Dynamically injected fixture needs the same conditional styles as a real authored form.
  for (const name of ['forms', 'form-content']) {
    await page.addStyleTag({ url: `/wp-content/themes/slateframe/assets/css/${name}.css` });
  }
  await page.locator('main').first().evaluate((main, html) => {
    const section = document.createElement('section');
    section.className = 'slateframe-shell';
    section.innerHTML = html;
    main.prepend(section);
  }, fixture);
  const form = page.locator('#slateframe-authored-form-reflow');
  await expect(form).toBeVisible();
  for (const direction of ['ltr', 'rtl']) {
    for (const fontSize of [16, 32, 64]) {
      await page.evaluate(({ direction, fontSize }) => {
        document.documentElement.dir = direction;
        document.documentElement.style.fontSize = fontSize + 'px';
      }, { direction, fontSize });
      const result = await form.evaluate((node) => {
        const row = node.querySelector('.slateframe-form-actions');
        const bounds = row.getBoundingClientRect();
        const buttons = [...row.querySelectorAll('button')].map((button) => {
          const box = button.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom,
            height: box.height, width: box.width, innerOverflow: button.scrollWidth - button.clientWidth };
        });
        return { display: getComputedStyle(row).display, flexWrap: getComputedStyle(row).flexWrap,
          fieldsetPadding: parseFloat(getComputedStyle(node.querySelector("fieldset")).paddingInlineStart),
          choices: [...row.querySelectorAll("input")].map(el => ({type: el.type, width: el.getBoundingClientRect().width, flexBasis: getComputedStyle(el).flexBasis})),
          bounds: { left: bounds.left, right: bounds.right, width: bounds.width }, buttons,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          bodyOverflow: document.body.scrollWidth - document.body.clientWidth };
      });
      expect(result.display).toBe('flex');
      expect(result.flexWrap).toBe('wrap');
      expect(result.fieldsetPadding).toBeLessThanOrEqual(24);
      for (const choice of result.choices) {
        expect(choice.flexBasis).toBe('auto');
        if (choice.type !== 'range') expect(choice.width).toBeLessThan(80);
      }
      expect(result.pageOverflow, `${width}px ${direction} ${fontSize}px`).toBeLessThanOrEqual(1);
      expect(result.bodyOverflow).toBeLessThanOrEqual(1);
      for (const button of result.buttons) {
        expect(button.left).toBeGreaterThanOrEqual(result.bounds.left - 1);
        expect(button.right).toBeLessThanOrEqual(result.bounds.right + 1);
        expect(button.innerOverflow).toBeLessThanOrEqual(1);
        expect(button.height).toBeGreaterThanOrEqual(44);
        if (fontSize === 64) {
          expect(button.width, `${width}px ${direction}: readable 400% action`).toBeGreaterThanOrEqual(
            Math.min(result.bounds.width, 12 * fontSize) - 2,
          );
        }
      }
      const [a, b] = result.buttons;
      expect(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1).toBe(true);
    }
  }
  if (![320, 390, 1440].includes(width)) return;
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const dir = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(dir, { recursive: true });
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate((value) => {
      document.documentElement.dir = value;
      document.documentElement.style.fontSize = '64px';
    }, direction);
    await page.locator('#sf-save').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#sf-reset')).toBeFocused();
    expect(await page.locator('#sf-reset').evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#sf-save')).toBeFocused();
    const palette = await page.locator('#sf-save').evaluate((el) => {
      const computed = getComputedStyle(el);
      return { foreground: computed.color, background: computed.backgroundColor };
    });
    expect(palette.foreground, `${width}px ${direction} system button foreground`).not.toBe(palette.background);
    await form.screenshot({ path: path.join(dir, `authored-form-${direction}-400-forced-colors-${width}.png`) });
    const axe = await new AxeBuilder({ page }).include('#slateframe-authored-form-reflow')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations, `${width}px ${direction} forced-colors`).toEqual([]);
  }
});
