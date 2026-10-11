const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || process.env.SLATEFRAME_PAGE_PATH || '/';
const width = (testInfo) => Number(testInfo.project.name.replace('viewport-', ''));

async function openGrid(page) {
  await page.goto(showcasePath, { waitUntil: 'networkidle' });
  const grid = page.locator('.browser-project-grid').first();
  await expect(grid).toBeVisible();
  const cards = grid.locator('.slateframe-project-card');
  const links = cards.locator('.wp-block-post-title a');
  expect(await cards.count()).toBeGreaterThanOrEqual(6);
  await expect(links).toHaveCount(await cards.count());
  return { grid, cards, links };
}

async function capture(page, testInfo, name) {
  if (![390, 1440].includes(width(testInfo))) return;
  const dir = path.resolve('test-artifacts/screenshots');
  await fs.mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `portfolio-${name}-${testInfo.project.name}.png`), fullPage: false });
}

test('native Query Loop project links meet the Appearance control target', async ({ page }) => {
  const { cards, links } = await openGrid(page);
  const control = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')));
  expect(control).toBeGreaterThanOrEqual(44);
  for (let i = 0; i < await links.count(); i += 1) {
    const item = await links.nth(i).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { height: rect.height, width: rect.width, cardWidth: node.closest('.slateframe-project-card').getBoundingClientRect().width, href: node.getAttribute('href'), display: getComputedStyle(node).display };
    });
    expect(item.href).toBeTruthy();
    expect(item.display).toBe('block');
    expect(item.height).toBeGreaterThanOrEqual(control - 1);
    expect(item.width).toBeGreaterThan(0);
    expect(item.width).toBeLessThanOrEqual(item.cardWidth + 1);
  }
  expect(await cards.count()).toBe(await links.count());
});

test('portfolio keyboard focus is visible in normal and forced colors', async ({ page }, testInfo) => {
  const { links } = await openGrid(page);
  await links.first().focus();
  await page.keyboard.press('Tab');
  await expect(links.nth(1)).toBeFocused();
  const metrics = async () => links.nth(1).evaluate((node) => {
    const style = getComputedStyle(node);
    return { kind: style.outlineStyle, size: Number.parseFloat(style.outlineWidth) };
  });
  expect((await metrics()).kind).toBe('solid');
  expect((await metrics()).size).toBeGreaterThanOrEqual(2);
  await page.emulateMedia({ forcedColors: 'active' });
  expect((await metrics()).kind).toBe('solid');
  expect((await metrics()).size).toBeGreaterThanOrEqual(2);
  await links.nth(1).scrollIntoViewIfNeeded();
  await capture(page, testInfo, 'keyboard-forced-colors');
});

test('RTL mixed CJK and Arabic project titles stay inside the grid', async ({ page }, testInfo) => {
  const { grid, links } = await openGrid(page);
  await grid.evaluate((node) => {
    node.dir = 'rtl';
    node.querySelectorAll('.wp-block-post-title a').forEach((link, index) => {
      link.textContent = `مشروع ${index + 1} — 日本語と中文の長い見出し — ` + 'portable-project-identifier-'.repeat(3);
    });
  });
  const geometry = await grid.evaluate((node) => ({
    direction: getComputedStyle(node).direction,
    viewport: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cards: [...node.querySelectorAll('.slateframe-project-card')].map((card) => {
      const box = card.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    }),
  }));
  expect(geometry.direction).toBe('rtl');
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  for (const card of geometry.cards) {
    expect(card.left).toBeGreaterThanOrEqual(-1);
    expect(card.right).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(card.width).toBeGreaterThan(0);
  }
  await expect(links.first()).toContainText('日本語');
  await links.first().scrollIntoViewIfNeeded();
  await capture(page, testInfo, 'rtl-cjk');
});

test('project links remain operable at 200 percent root text size', async ({ page }, testInfo) => {
  const { grid, links } = await openGrid(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const geometry = await grid.evaluate((node) => ({
    viewport: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    gridWidth: node.getBoundingClientRect().width,
    control: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')),
  }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.gridWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  for (const link of await links.all()) {
    expect(await link.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(geometry.control - 1);
  }
  await links.first().scrollIntoViewIfNeeded();
  await capture(page, testInfo, 'text-zoom-200');
});
