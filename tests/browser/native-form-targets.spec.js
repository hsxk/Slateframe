const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const path = require('node:path');

const fixture = '<form id="slateframe-native-form-fixture" aria-label="Native control target verification">'
  + '<p><label id="sf-nested-check"><input type="checkbox" id="sf-check"> 中文 日本語 consent</label></p>'
  + '<p><input type="checkbox" id="sf-cookie"><label id="sf-sibling-check" for="sf-cookie">Save name — العربية</label></p>'
  + '<fieldset><legend>Choice</legend><label id="sf-nested-radio"><input type="radio" name="sf-choice" value="a">First</label>'
  + '<input type="radio" name="sf-choice" value="b" id="sf-radio-b"><label id="sf-sibling-radio" for="sf-radio-b">Second</label></fieldset>'
  + '<p><input type="range" aria-label="Native range" min="0" max="100" value="50"></p>'
  + '<p><input type="color" aria-label="Native color"></p>'
  + '<p><input type="file" aria-label="Native file"></p>'
  + '<div style="display:flex;min-width:0"><input type="file" aria-label="Flex file"></div></form>';
const labels = ['#sf-nested-check', '#sf-sibling-check', '#sf-nested-radio', '#sf-sibling-radio'];

async function mount(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main').first()).toBeVisible();
  await page.locator('main').first().evaluate((main, html) => {
    const section = document.createElement('section');
    section.className = 'slateframe-shell';
    section.innerHTML = html;
    main.prepend(section);
  }, fixture);
  await expect(page.locator('#slateframe-native-form-fixture')).toBeVisible();
}

test('native form targets follow bounded sizes in LTR and RTL without overflow', async ({ page }) => {
  await mount(page);
  for (const direction of ['ltr', 'rtl']) {
    for (const size of [44, 48, 56]) {
      await page.evaluate(({ direction, size }) => {
        document.documentElement.dir = direction;
        document.documentElement.style.setProperty('--slateframe-control', size + 'px');
      }, { direction, size });
      for (const selector of labels) {
        const box = await page.locator(selector).boundingBox();
        expect(box?.height || 0, selector + ' ' + direction + ' ' + size).toBeGreaterThanOrEqual(size);
      }
      for (const label of ['Native range', 'Native color', 'Native file', 'Flex file']) {
        const box = await page.getByLabel(label, { exact: true }).boundingBox();
        expect(box?.height || 0, label + ' ' + direction + ' ' + size).toBeGreaterThanOrEqual(size);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, direction + ' ' + size + 'px').toBeLessThanOrEqual(1);
    }
  }
});

test('native labels, keyboard, zoom and forced-colors preserve accessibility', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport?.width;
  test.skip(![320, 390, 1440].includes(width), 'Representative keyboard and zoom coverage');
  await mount(page);
  await page.locator('#sf-nested-check').click();
  await expect(page.locator('#sf-check')).toBeChecked();
  await page.locator('#sf-check').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#sf-check')).not.toBeChecked();
  await page.locator('#sf-sibling-check').click();
  await expect(page.locator('#sf-cookie')).toBeChecked();
  await page.locator('#sf-nested-radio').click();
  await expect(page.locator('input[name="sf-choice"][value="a"]')).toBeChecked();
  await page.locator('#sf-sibling-radio').click();
  await expect(page.locator('input[name="sf-choice"][value="b"]')).toBeChecked();
  await expect(page.locator('input[name="sf-choice"][value="a"]')).not.toBeChecked();
  const slider = page.getByLabel('Native range');
  await slider.focus();
  const before = Number(await slider.inputValue());
  await page.keyboard.press('ArrowRight');
  expect(Number(await slider.inputValue())).toBeGreaterThan(before);
  const file = page.getByLabel('Native file', { exact: true });
  await file.focus();
  expect(await file.evaluate((node) => document.activeElement === node)).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '64px';
    document.documentElement.dir = 'rtl';
  });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  for (const selector of labels) {
    const box = await page.locator(selector).boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const a11y = await new AxeBuilder({ page }).include('#slateframe-native-form-fixture')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
  const directory = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(directory, { recursive: true });
  await page.locator('#slateframe-native-form-fixture').screenshot({
    path: path.join(directory, 'native-form-targets-rtl-zoom-' + width + '.png'),
  });
});

test('native file selector wraps its button in narrow RTL forced-colors layout', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport?.width;
  test.skip(![320, 390, 1440].includes(width), 'Representative native file-button viewports');
  await mount(page);
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '64px';
    for (const input of document.querySelectorAll('#slateframe-native-form-fixture input[type="file"]')) {
      input.style.inlineSize = '100%';
    }
  });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const files = page.locator('#slateframe-native-form-fixture input[type="file"]');
  await expect(files).toHaveCount(2);
  for (const input of await files.all()) {
    const measure = await input.evaluate((node) => {
      const button = getComputedStyle(node, '::file-selector-button');
      return {
        inputWidth: node.getBoundingClientRect().width,
        buttonWidth: parseFloat(button.width),
        buttonHeight: parseFloat(button.height),
        fontSize: parseFloat(getComputedStyle(node).fontSize),
        whiteSpace: button.whiteSpace,
        overflowWrap: button.overflowWrap,
        internalOverflow: node.scrollWidth - node.clientWidth,
        inputWhiteSpace: getComputedStyle(node).whiteSpace,
      };
    });
    expect(measure.inputWidth).toBeGreaterThan(0);
    expect(measure.buttonWidth).toBeLessThanOrEqual(measure.inputWidth + 1);
    expect(measure.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(measure.buttonHeight).toBeLessThanOrEqual(Math.max(44, measure.fontSize * 3));
    expect(measure.whiteSpace).toBe('normal');
    expect(measure.overflowWrap).toBe('anywhere');
    expect(measure.internalOverflow, 'Native file label must not be clipped inside the input').toBeLessThanOrEqual(1);
    expect(measure.inputWhiteSpace).toBe('normal');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const directory = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(directory, { recursive: true });
  await files.last().screenshot({
    path: path.join(directory, 'native-file-selector-rtl-forced-colors-' + width + '.png'),
  });
});
