const { test, expect } = require('@playwright/test');

const routes = [
  ['article', process.env.SLATEFRAME_POST_PATH || '/'],
  ['knowledge', process.env.SLATEFRAME_KNOWLEDGE_PATH || process.env.SLATEFRAME_PAGE_PATH || '/'],
  ['portfolio', process.env.SLATEFRAME_PROJECT_PATH || process.env.SLATEFRAME_PAGE_PATH || '/'],
  ['showcase', process.env.SLATEFRAME_SHOWCASE_PATH || process.env.SLATEFRAME_PAGE_PATH || '/'],
];

test('400% Chromium zoom keeps content routes inside the layout viewport in LTR and RTL', async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.viewport?.width !== 1440, '1440px at 400% is a 360px CSS layout viewport.');

  for (const direction of ['ltr', 'rtl']) {
    for (const [name, route] of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.evaluate((dir) => {
        document.documentElement.dir = dir;
        document.documentElement.style.zoom = '4';
      }, direction);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const width = root.clientWidth;
        const offenders = [...document.querySelectorAll('body *')]
          .filter((element) => {
            const style = getComputedStyle(element);
            if (style.position === 'fixed' || style.display === 'none') return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -2 || rect.right > window.innerWidth + 2);
          })
          .slice(0, 8)
          .map((element) => ({ tag: element.tagName, className: String(element.className).slice(0, 90) }));
        return {
          width,
          scrollWidth: root.scrollWidth,
          bodyScrollWidth: body.scrollWidth,
          overflow: root.scrollWidth - width,
          offenders,
        };
      });
      expect(geometry.overflow, `${name} ${direction} at 400%: ${JSON.stringify(geometry)}`).toBeLessThanOrEqual(2);
    }
  }
});
