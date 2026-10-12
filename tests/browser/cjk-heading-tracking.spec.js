const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const widthOf = info => info.project.use.viewport?.width || 1440;

test('CJK headings use natural tracking; Latin display rhythm remains', async ({ page }, info) => {
  test.skip(![390, 1440].includes(widthOf(info)), 'Representative mobile/desktop visual evidence');
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const section = document.createElement('section');
    section.id = 'slateframe-cjk-tracking-fixture';
    section.style.cssText = 'width:min(100%,60rem);margin-inline:auto;padding:1rem;overflow-wrap:anywhere';
    section.innerHTML = `
      <div lang="ja"><h1 class="slateframe-entry-title">「日本語の見出し」</h1><h2 class="slateframe-card-title">長い見出しと句読点</h2><h3>記事の小見出し</h3></div>
      <div lang="zh-Hans"><h2>中文标题与标点「测试」</h2></div>
      <div lang="zh-Hant"><h2>繁體中文標題「測試」</h2></div>
      <div lang="ko-KR"><h3>한국어 제목 확인</h3></div>
      <div lang="ja-JP"><h3>日本語の見出し</h3></div>
      <div lang="en"><h1 class="slateframe-entry-title">English heading rhythm</h1></div>`;
    (document.querySelector('main') || document.body).prepend(section);
  });
  const fixture = page.locator('#slateframe-cjk-tracking-fixture');
  const cjk = fixture.locator('[lang="ja"] :is(h1,h2,h3),[lang="zh-Hans"] h2,[lang="zh-Hant"] h2,[lang="ko-KR"] h3,[lang="ja-JP"] h3');
  const english = fixture.locator('[lang="en"] h1');
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      for (const heading of await cjk.all()) {
        expect(await heading.evaluate(node => getComputedStyle(node).letterSpacing), `${width}px ${dir} CJK`).toBe('normal');
      }
      expect(await english.evaluate(node => getComputedStyle(node).letterSpacing), `${width}px ${dir} Latin`).not.toBe('normal');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'overflow').toBeLessThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: widthOf(info), height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'forcedColors overflow').toBeLessThanOrEqual(1);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await fixture.screenshot({ path: `test-artifacts/screenshots/cjk-heading-tracking-viewport-${widthOf(info)}-rtl-200-forced-colors.png` });
});
