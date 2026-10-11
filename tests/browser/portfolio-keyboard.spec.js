const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || process.env.SLATEFRAME_PAGE_PATH || '/';
const width = (testInfo) => Number(testInfo.project.name.replace('viewport-', ''));

async function openGrid(page, targetPath = showcasePath) {
  await page.goto(targetPath, { waitUntil: 'networkidle' });
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

test('native featured-image links have full-frame targets and predictable keyboard order', async ({ page }, testInfo) => {
  // Showcase Query Loops can contain text-only posts. Test Core media on
  // the dedicated Portfolio fixture where featured images are present.
  const portfolioPath = process.env.SLATEFRAME_PROJECT_PATH;
  expect(portfolioPath).toBeTruthy();
  const { grid } = await openGrid(page, portfolioPath);
  const mediaCards = grid.locator('.slateframe-project-card:has(.wp-block-post-featured-image a:has(img))');
  expect(await mediaCards.count()).toBeGreaterThanOrEqual(4);
  const card = mediaCards.first();
  const mediaLink = card.locator('.wp-block-post-featured-image a:has(img)');
  await expect(mediaLink).toBeVisible();
  await mediaLink.scrollIntoViewIfNeeded();
  await expect.poll(() => mediaLink.locator('img').evaluate((image) =>
    image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  )).toBe(true);
  const titleLink = card.locator('.wp-block-post-title a');
  await expect(titleLink).toBeVisible();
  expect(await mediaLink.getAttribute('href')).toBe(await titleLink.getAttribute('href'));

  const geometry = await mediaLink.evaluate((node) => {
    const image = node.querySelector('img');
    const frame = node.getBoundingClientRect();
    const raster = image.getBoundingClientRect();
    return {
      display: getComputedStyle(node).display,
      height: frame.height,
      width: frame.width,
      imageHeight: raster.height,
      imageWidth: raster.width,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(geometry.display).toBe('block');
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(Math.abs(geometry.height - geometry.imageHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.width - geometry.imageWidth)).toBeLessThanOrEqual(1);
  expect(geometry.overflow).toBeLessThanOrEqual(1);

  await mediaLink.focus();
  await page.keyboard.press('Tab');
  await expect(titleLink).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(mediaLink).toBeFocused();
  const focus = async () => mediaLink.evaluate((node) => ({
    style: getComputedStyle(node).outlineStyle,
    width: Number.parseFloat(getComputedStyle(node).outlineWidth),
  }));
  expect((await focus()).style).toBe('solid');
  expect((await focus()).width).toBeGreaterThanOrEqual(2);
  await page.emulateMedia({ forcedColors: 'active' });
  expect((await focus()).style).toBe('solid');
  expect((await focus()).width).toBeGreaterThanOrEqual(2);
  await mediaLink.scrollIntoViewIfNeeded();
  await capture(page, testInfo, 'media-link-forced-colors');
});

test('text-only project cards expose no phantom featured-image links', async ({ page }) => {
  const { cards } = await openGrid(page);
  const textOnly = await cards.evaluateAll((nodes) => nodes
    .filter((card) => !card.querySelector('.wp-block-post-featured-image img'))
    .map((card) => ({
      mediaLinks: card.querySelectorAll('.wp-block-post-featured-image a').length,
      titleHref: card.querySelector('.wp-block-post-title a')?.getAttribute('href') || '',
    })));
  expect(textOnly.length).toBeGreaterThan(0);
  for (const card of textOnly) {
    expect(card.mediaLinks).toBe(0);
    expect(card.titleHref).not.toBe('');
  }
});

test('Portfolio supports mixed native featured images and text-only cards', async ({ page }) => {
  const portfolioPath = process.env.SLATEFRAME_PROJECT_PATH;
  expect(portfolioPath).toBeTruthy();
  const { cards } = await openGrid(page, portfolioPath);
  await expect(cards).toHaveCount(6);
  const details = await cards.evaluateAll((nodes) => nodes.map((card) => {
    const image = card.querySelector('.wp-block-post-featured-image img');
    const mediaLink = card.querySelector('.wp-block-post-featured-image a');
    const titleLink = card.querySelector('.wp-block-post-title a');
    return {
      title: titleLink?.textContent?.trim() || '',
      href: titleLink?.getAttribute('href') || '',
      mediaHref: mediaLink?.getAttribute('href') || '',
      imagePresent: Boolean(image),
      alt: image?.getAttribute('alt') || '',
    };
  }));
  expect(details.filter((card) => card.imagePresent)).toHaveLength(5);
  expect(details.filter((card) => !card.imagePresent)).toHaveLength(1);
  for (const card of details) {
    expect(card.href).toBeTruthy();
    expect(card.title).toBeTruthy();
    if (card.imagePresent) {
      expect(card.alt).not.toBe('');
      expect(card.mediaHref).toBe(card.href);
    } else {
      expect(card.mediaHref).toBe('');
    }
  }
  for (const image of await cards.locator('.wp-block-post-featured-image img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) =>
      node.complete && node.naturalWidth > 0 && node.naturalHeight > 0
    )).toBe(true);
  }
});

test('Portfolio native pagination separates page two from page one', async ({ page }) => {
  const portfolioPath = process.env.SLATEFRAME_PROJECT_PATH;
  expect(portfolioPath).toBeTruthy();
  const { grid, cards } = await openGrid(page, portfolioPath);
  const firstPageUrls = await cards.locator('.wp-block-post-title a').evaluateAll((nodes) =>
    nodes.map((node) => node.href)
  );
  expect(new Set(firstPageUrls).size).toBe(6);
  const next = grid.locator('.wp-block-query-pagination-next');
  await expect(next).toBeVisible();
  await next.click();
  const remaining = page.locator('.browser-project-grid').first().locator('.slateframe-project-card');
  await expect(remaining).toHaveCount(1);
  const remainingTitle = remaining.locator('.wp-block-post-title a');
  await expect(remainingTitle).toContainText('Portable project fixture 1');
  expect(firstPageUrls).not.toContain(await remainingTitle.evaluate((node) => node.href));
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  )).toBeLessThanOrEqual(1);
});
