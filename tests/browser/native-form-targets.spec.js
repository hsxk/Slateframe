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
  test.skip(![320, 375, 390, 412, 768, 1440, 1920].includes(width), 'Representative keyboard and zoom coverage');
  await mount(page);
  // Exercise keyboard and zoom behavior at every supported responsive breakpoint.
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
  // Verify native file selection still works after the responsive control styling.
  await file.setInputFiles({ name: 'sample-日本語.txt', mimeType: 'text/plain', buffer: Buffer.from('Slateframe fixture') });
  expect(await file.evaluate((node) => ({ name: node.files[0]?.name, size: node.files[0]?.size })))
    .toEqual({ name: 'sample-日本語.txt', size: Buffer.byteLength('Slateframe fixture') });
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
  test.skip(![320, 375, 390, 412, 768, 1440, 1920].includes(width), 'Representative native file-button viewports');
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
        inputOverflowWrap: getComputedStyle(node).overflowWrap,
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
    expect(measure.inputOverflowWrap).toBe('anywhere');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const directory = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(directory, { recursive: true });
  await files.last().screenshot({
    path: path.join(directory, 'native-file-selector-rtl-forced-colors-' + width + '.png'),
  });
});


test('article headings and site chrome remain inside the viewport at 400% zoom', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport?.width;
  test.skip(![320, 375, 390, 412, 768, 1440, 1920].includes(width), 'Seven supported responsive breakpoints');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '64px';
    const main = document.querySelector('main');
    const title = document.createElement('h1');
    title.className = 'slateframe-page-title';
    title.textContent = 'Long article heading 日本語中文한국어 — accessibility and responsive typography';
    // Match the theme's content gutter: an unwrapped test heading touches the viewport edge.
    const shell = document.createElement('div');
    shell.className = 'slateframe-shell';
    shell.append(title);
    main.prepend(shell);
  });
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate((dir) => { document.documentElement.dir = dir; }, direction);
    const dimensions = await page.evaluate(() => {
      const title = document.querySelector('main > .slateframe-shell > .slateframe-page-title');
      const box = title.getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        titleLeft: box.left,
        titleRight: box.right,
        titleHeight: box.height,
        titleFontSize: parseFloat(getComputedStyle(title).fontSize),
      };
    });
    expect(dimensions.scrollWidth - dimensions.viewport, direction + ' ' + width).toBeLessThanOrEqual(1);
    expect(dimensions.titleLeft, direction + ' ' + width).toBeGreaterThanOrEqual(-1);
    expect(dimensions.titleRight, direction + ' ' + width).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.titleHeight).toBeGreaterThan(0);
    // Guard the compact-header intrinsic-size regression: a long identity must not
    // stretch the page beyond the viewport when text is enlarged to 400%.
    const chrome = await page.evaluate(() => {
      const brand = document.querySelector('.slateframe-brand');
      const header = document.querySelector('.slateframe-site-header');
      const viewport = document.documentElement.clientWidth;
      const rect = brand?.getBoundingClientRect();
      return { viewport, headerPresent: !!header, brandPresent: !!brand,
        brandLeft: rect?.left, brandRight: rect?.right, brandWidth: rect?.width };
    });
    expect(chrome.headerPresent).toBe(true);
    expect(chrome.brandPresent).toBe(true);
    expect(chrome.brandLeft, direction + ' brand left ' + width).toBeGreaterThanOrEqual(-1);
    expect(chrome.brandRight, direction + ' brand right ' + width).toBeLessThanOrEqual(chrome.viewport + 1);
    expect(chrome.brandWidth, direction + ' brand width ' + width).toBeLessThanOrEqual(chrome.viewport + 1);
    if (width <= 480) {
      // At 400% text zoom, keep the title readable without forcing 1.65rem minimum.
      expect(dimensions.titleFontSize, direction + ' ' + width).toBeLessThanOrEqual(64.5);
    }
  }
  const directory = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, 'article-title-rtl-400pct-' + width + '.png'), fullPage: true });
});


test('Core Details keeps native disclosure behavior and bounded hit target in RTL and LTR', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport?.width;
  test.skip(![320, 375, 390, 412, 768, 1440, 1920].includes(width), 'Supported responsive breakpoints');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('main').first().evaluate((main) => {
    const shell = document.createElement('section');
    shell.className = 'slateframe-shell';
    shell.innerHTML = '<details class="wp-block-details"><summary>日本語中文한국어 — Long accessible disclosure title with wrapping</summary><p>Visible disclosure content</p></details>';
    main.prepend(shell);
  });
  const details = page.locator('main .wp-block-details').first();
  const summary = details.locator('summary');
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate((dir) => {
      document.documentElement.dir = dir;
      document.documentElement.style.fontSize = '64px';
    }, direction);
    await expect(details).not.toHaveAttribute('open');
    await summary.focus();
    expect(await summary.evaluate((node) => document.activeElement === node)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open');
    await expect(details.getByText('Visible disclosure content')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(details).not.toHaveAttribute('open');
    await summary.press('Space');
    await expect(details).toHaveAttribute('open');
    const bounds = await summary.boundingBox();
    expect(bounds?.height || 0).toBeGreaterThanOrEqual(44);
    expect(bounds?.x ?? -100, direction + ' summary left').toBeGreaterThanOrEqual(-1);
    expect((bounds?.x || 0) + (bounds?.width || 0), direction + ' summary right')
      .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth + 1));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await summary.press('Space');
    await expect(details).not.toHaveAttribute('open');
  }
});
