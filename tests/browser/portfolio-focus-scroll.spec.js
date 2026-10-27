const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const projectPath = process.env.SLATEFRAME_PROJECT_PATH;
const projectWidth = (info) => info.project.use.viewport?.width || 0;

async function openPortfolio(page) {
  await page.goto(projectPath, { waitUntil: 'domcontentloaded' });
  const grid = page.locator('.slateframe-project-grid .wp-block-post-template').first();
  await expect(grid).toBeVisible();
  const title = grid.locator('.wp-block-post-title a').last();
  await expect(title).toBeVisible();
  return title;
}

async function checkScrollTarget(page, link, viewport, direction, font) {
  await page.setViewportSize({ width: viewport, height: 900 });
  await page.locator('html').evaluate((root, state) => {
    root.dir = state.direction;
    root.style.setProperty('font-size', state.font + 'px', 'important');
  }, { direction, font });
  await expect.poll(() => page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).fontSize)
  )).toBe(font);
  await link.evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const result = await link.evaluate(node => {
    const header = document.querySelector('.slateframe-site-header');
    const h = header.getBoundingClientRect();
    const target = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      headerPosition: getComputedStyle(header).position,
      headerBottom: h.bottom,
      headerHeight: h.height,
      targetTop: target.top,
      targetHeight: target.height,
      scrollMargin: parseFloat(style.scrollMarginBlockStart),
      rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const label = viewport + 'px ' + direction + ' ' + font + 'px';
  expect(result.rootPx, label + ' computed text enlargement').toBe(font);
  expect(result.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
  expect(result.targetHeight, label + ' 44px title target').toBeGreaterThanOrEqual(43);
  if (viewport > 480) {
    expect(result.headerPosition, label + ' sticky header').toBe('sticky');
    expect(result.scrollMargin, label + ' sticky-header scroll clearance')
      .toBeGreaterThanOrEqual(result.headerHeight - 1);
    expect(result.targetTop, label + ' title not obscured')
      .toBeGreaterThanOrEqual(result.headerBottom - 1);
  } else {
    expect(result.headerPosition, label + ' mobile header is not sticky').toBe('relative');
    expect(result.scrollMargin, label + ' no unnecessary mobile scroll offset').toBe(0);
  }
  await link.focus();
  await expect(link).toBeFocused();
  if (viewport > 480) {
    const afterFocus = await link.evaluate(node => ({
      top: node.getBoundingClientRect().top,
      headerBottom: document.querySelector('.slateframe-site-header').getBoundingClientRect().bottom,
    }));
    expect(afterFocus.top, label + ' keyboard focus not obscured')
      .toBeGreaterThanOrEqual(afterFocus.headerBottom - 1);
  }
  const focus = await link.evaluate(node => ({
    outline: getComputedStyle(node).outlineStyle,
    width: parseFloat(getComputedStyle(node).outlineWidth),
  }));
  expect(focus.outline, label + ' visible keyboard focus').not.toBe('none');
  expect(focus.width, label + ' focus outline width').toBeGreaterThanOrEqual(2);
}

test('native Portfolio anchor targets clear sticky header in LTR/RTL at 100/200/400%', async ({ page }, info) => {
  test.skip(!projectPath || ![768, 1440].includes(projectWidth(info)), 'Two real WordPress desktop/tablet fixtures');
  test.setTimeout(120000);
  const link = await openPortfolio(page);
  for (const direction of ['ltr', 'rtl']) {
    for (const font of [16, 32, 64]) {
      await checkScrollTarget(page, link, projectWidth(info), direction, font);
    }
  }
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  if (projectWidth(info) === 768) {
    await checkScrollTarget(page, link, 768, 'rtl', 32);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await checkScrollTarget(page, link, 768, 'rtl', 32);
    await page.screenshot({
      path: 'test-artifacts/screenshots/portfolio-focus-scroll-768-rtl-200-forced-colors.png',
      animations: 'disabled',
    });
  } else {
    await checkScrollTarget(page, link, 1440, 'ltr', 64);
    await page.screenshot({
      path: 'test-artifacts/screenshots/portfolio-focus-scroll-1440-ltr-400.png',
      animations: 'disabled',
    });
  }
});

test('mobile Portfolio anchors keep the non-sticky header behavior at 400%', async ({ page }, info) => {
  test.skip(!projectPath || projectWidth(info) !== 390, 'Single real WordPress mobile fixture');
  test.setTimeout(90000);
  const link = await openPortfolio(page);
  for (const viewport of [320, 375, 390, 412]) {
    for (const direction of ['ltr', 'rtl']) {
      await checkScrollTarget(page, link, viewport, direction, 64);
    }
  }
  await checkScrollTarget(page, link, 390, 'rtl', 64);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.screenshot({
    path: 'test-artifacts/screenshots/portfolio-focus-scroll-390-rtl-400.png',
    animations: 'disabled',
  });
});
