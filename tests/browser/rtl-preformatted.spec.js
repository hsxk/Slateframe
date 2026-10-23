const { test, expect } = require('@playwright/test');

// Core Preformatted is authored prose; Core Code is a source-code container.
test('RTL Core Preformatted follows prose while Code remains LTR at all widths', async ({ page }, info) => {
  test.skip((info.project.use.viewport?.width || 1440) !== 390);
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  await page.addStyleTag({ path: 'rtl.css' });
  await page.locator('.slateframe-prose').first().evaluate(root => {
    const fixture = document.createElement('section');
    fixture.className = 'slateframe-preformatted-rtl-fixture';
    const prose = document.createElement('pre');
    prose.className = 'wp-block-preformatted';
    prose.textContent = 'نص عربي متعدد الأسطر\n  日本語の整形済みテキスト\n' + 'نص '.repeat(90);
    const verse = document.createElement('pre');
    verse.className = 'wp-block-verse';
    verse.textContent = 'قصيدة عربية\n日本語の詩\n中文诗歌';
    const code = document.createElement('pre');
    code.className = 'wp-block-code';
    code.textContent = 'const source = "' + 'source-'.repeat(90) + '";';
    prose.tabIndex = 0;
    verse.tabIndex = 0;
    code.tabIndex = 0;
    fixture.append(prose, verse, code);
    root.append(fixture);
  });
  const fixture = page.locator('.slateframe-preformatted-rtl-fixture');
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      const result = await fixture.evaluate(root => ({
        proseDirection: getComputedStyle(root.querySelector('.wp-block-preformatted')).direction,
        verseDirection: getComputedStyle(root.querySelector('.wp-block-verse')).direction,
        codeDirection: getComputedStyle(root.querySelector('.wp-block-code')).direction,
        proseOverflow: getComputedStyle(root.querySelector('.wp-block-preformatted')).overflowX,
        codeOverflow: getComputedStyle(root.querySelector('.wp-block-code')).overflowX,
        codeAlign: getComputedStyle(root.querySelector('.wp-block-code')).textAlign,
        codeScrollable: root.querySelector('.wp-block-code').scrollWidth > root.querySelector('.wp-block-code').clientWidth,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(result.proseDirection, `${width}px ${dir}`).toBe(dir);
      expect(result.verseDirection, `${width}px ${dir} Verse must follow prose`).toBe(dir);
      expect(result.codeDirection).toBe('ltr');
      expect(result.codeAlign).toBe('left');
      expect(result.codeOverflow).toBe('auto');
      expect(result.codeScrollable, `${width}px ${dir} code must scroll inside its own box`).toBe(true);
      expect(result.proseOverflow).toBe('auto');
      expect(result.pageOverflow).toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await fixture.locator('.wp-block-preformatted').evaluate(node => getComputedStyle(node).direction)).toBe('rtl');
  expect(await fixture.locator('.wp-block-verse').evaluate(node => getComputedStyle(node).direction)).toBe('rtl');
  expect(await fixture.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await fixture.locator('.wp-block-verse').focus();
  await page.keyboard.press('Tab');
  await expect(fixture.locator('.wp-block-code')).toBeFocused();
  await fixture.screenshot({ path: 'test-artifacts/screenshots/rtl-preformatted-390-zoom-forced-colors.png' });
});
