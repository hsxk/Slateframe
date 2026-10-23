const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const widths = [320, 375, 390, 412, 768, 1440, 1920];
const languages = ['ja', 'zh-Hans', 'zh-Hant', 'ko-KR', 'en'];

test('site identity preserves CJK tracking and focus at responsive widths', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One worker exercises every required viewport.');
  await page.goto('/', { waitUntil: 'networkidle' });
  const brand = page.locator('.slateframe-brand-title');
  const link = page.locator('.slateframe-brand');
  await expect(brand).toHaveCount(1);
  const previous = await page.evaluate(() => {
    const node = document.querySelector('.slateframe-brand-title');
    return {
      dir: document.documentElement.getAttribute('dir'),
      rootLang: document.documentElement.getAttribute('lang'),
      font: document.documentElement.style.fontSize,
      text: node.textContent,
      lang: node.getAttribute('lang'),
    };
  });
  try {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        for (const zoom of ['100%', '400%']) {
          for (const lang of languages) {
            await page.evaluate(({ direction, zoom, lang }) => {
              document.documentElement.dir = direction;
              document.documentElement.style.fontSize = zoom;
              const node = document.querySelector('.slateframe-brand-title');
              node.lang = lang;
              node.textContent = lang === 'en' ? 'Slateframe' : '風景と物語';
            }, { direction, zoom, lang });
            const result = await brand.evaluate(node => ({
              tracking: getComputedStyle(node).letterSpacing,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            }));
            if (lang === 'en') {
              expect(result.tracking, `${width}px ${direction} ${zoom} Latin`).not.toBe('normal');
            } else {
              expect(result.tracking, `${width}px ${direction} ${zoom} ${lang}`).toBe('normal');
            }
            expect(result.overflow, `${width}px ${direction} ${zoom} ${lang}`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
    await page.evaluate(() => {
      document.documentElement.lang = 'ja';
      const node = document.querySelector('.slateframe-brand-title');
      node.removeAttribute('lang');
      node.textContent = '風景と物語';
    });
    await expect.poll(() => brand.evaluate(node => getComputedStyle(node).letterSpacing)).toBe('normal');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
        document.documentElement.style.fontSize = '400%';
      });
      await page.emulateMedia({ forcedColors: 'active' });
      await link.focus();
      await expect(link).toBeFocused();
      const folder = path.resolve('test-artifacts/screenshots');
      await fs.mkdir(folder, { recursive: true });
      await page.screenshot({
        path: path.join(folder, `cjk-brand-${width}-rtl-400-forced-colors.png`),
        fullPage: true,
      });
    }
  } finally {
    await page.emulateMedia({ forcedColors: 'none' });
    await page.evaluate(previous => {
      const root = document.documentElement;
      const node = document.querySelector('.slateframe-brand-title');
      root.style.fontSize = previous.font;
      previous.dir === null ? root.removeAttribute('dir') : root.setAttribute('dir', previous.dir);
      previous.rootLang === null ? root.removeAttribute('lang') : root.setAttribute('lang', previous.rootLang);
      node.textContent = previous.text;
      previous.lang === null ? node.removeAttribute('lang') : node.setAttribute('lang', previous.lang);
    }, previous);
  }
});
