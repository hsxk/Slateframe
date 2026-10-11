const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const editorialPath = process.env.SLATEFRAME_EDITORIAL_PATHWAYS_PATH;
const width = info => Number(info.project.name.replace('viewport-', ''));
async function open(page) {
  expect(editorialPath, 'CI must create the registered WordPress pattern page').toBeTruthy();
  await page.goto(editorialPath, { waitUntil: 'networkidle' });
  const pattern = page.locator('.slateframe-editorial-pathways').first();
  await expect(pattern).toBeVisible();
  return pattern;
}
async function capture(page, info, suffix = '') {
  const dir = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, 'editorial-pathways-' + info.project.name + suffix + '.png'), fullPage: true });
}
test('three Core pathways preserve reading order and responsive columns', async ({ page }, info) => {
  const pattern = await open(page);
  expect(await pattern.locator('h2, h3').evaluateAll(nodes => nodes.map(node => node.tagName)))
    .toEqual(['H2', 'H3', 'H3', 'H3']);
  await expect(pattern.locator('.wp-block-column')).toHaveCount(3);
  await expect(pattern.locator('a')).toHaveCount(0);
  const boxes = await pattern.locator('.wp-block-column').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { top: rect.top, left: rect.left, right: rect.right, width: rect.width };
  }));
  const viewport = await page.evaluate(() => document.documentElement.clientWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
  for (const box of boxes) {
    expect(box.width).toBeGreaterThan(0);
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(viewport + 1);
  }
  if (width(info) <= 768) {
    expect(boxes[1].top).toBeGreaterThan(boxes[0].top);
    expect(boxes[2].top).toBeGreaterThan(boxes[1].top);
  } else {
    expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThanOrEqual(2);
  }
  if ([390, 1440].includes(width(info))) await capture(page, info);
});
test('RTL and mixed CJK headings remain inside the page', async ({ page }, info) => {
  test.skip(![320, 390, 412].includes(width(info)), 'Small-screen RTL evidence');
  const pattern = await open(page);
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await pattern.locator('h3').first().evaluate(node => {
    node.textContent = 'مسار القراءة 中文と日本語の長い見出し — ' + 'portable-editorial-identifier-'.repeat(3);
  });
  await expect(pattern.locator('h3').first()).toContainText('日本語');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
  if (width(info) === 390) await capture(page, info, '-rtl-cjk');
});
test('200% text, forced colors and reduced motion preserve all directions', async ({ page }, info) => {
  test.skip(![390, 1440].includes(width(info)), 'Representative mobile and desktop evidence');
  const pattern = await open(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(pattern.locator('.wp-block-column')).toHaveCount(3);
  const viewport = await page.evaluate(() => document.documentElement.clientWidth);
  for (const column of await pattern.locator('.wp-block-column').all()) {
    const rect = await column.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect.x).toBeGreaterThanOrEqual(-1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
  await capture(page, info, '-zoom-forced-colors');
});