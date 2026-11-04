const { test, expect } = require('@playwright/test');

const routes = [
  ['article', 'SLATEFRAME_POST_PATH'],
  ['knowledge', 'SLATEFRAME_KNOWLEDGE_PATH'],
  ['portfolio', 'SLATEFRAME_PROJECT_PATH'],
  ['showcase', 'SLATEFRAME_SHOWCASE_PATH'],
];

test('400% reflow keeps distinct content routes inside a 360px CSS viewport in LTR and RTL', async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.viewport?.width !== 1440, 'One desktop project tests 1440 / 4 = 360 CSS pixels.');

  // A 360px layout viewport activates the same responsive media queries as
  // 1440px at 400% browser zoom; CSS zoom on the root does not.
  await page.setViewportSize({ width: 360, height: 900 });
  const paths = routes.map(([name, key]) => {
    const route = process.env[key];
    expect(route, `Missing seeded ${name} route (${key}); refusing to test the home page instead`).toBeTruthy();
    return [name, route];
  });
  expect(new Set(paths.map(([, route]) => route)).size, 'Content fixtures must use distinct routes').toBe(paths.length);

  for (const direction of ['ltr', 'rtl']) {
    for (const [name, route] of paths) {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status(), `${name} ${direction}: fixture must return HTTP 200`).toBe(200);
      await page.evaluate((dir) => { document.documentElement.dir = dir; }, direction);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const root = document.documentElement;
        const width = root.clientWidth;
        const offenders = [...document.querySelectorAll('body *')]
          .filter((element) => {
            const style = getComputedStyle(element);
            if (style.position === 'fixed' || style.display === 'none') return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -2 || rect.right > width + 2);
          })
          .slice(0, 8)
          .map((element) => ({ tag: element.tagName, className: String(element.className).slice(0, 90) }));
        return {
          viewport: window.innerWidth,
          width,
          scrollWidth: root.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          overflow: root.scrollWidth - width,
          offenders,
        };
      });
      expect(geometry.viewport, `${name} ${direction}: effective viewport`).toBe(360);
      expect(geometry.width, `${name} ${direction}: document layout viewport`).toBe(360);
      expect(geometry.overflow, `${name} ${direction}: ${JSON.stringify(geometry)}`).toBeLessThanOrEqual(2);
      expect(geometry.bodyScrollWidth - geometry.width, `${name} ${direction}: body overflow ${JSON.stringify(geometry)}`).toBeLessThanOrEqual(2);
    }
  }
});
