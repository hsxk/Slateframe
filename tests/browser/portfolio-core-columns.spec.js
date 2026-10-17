const { test, expect } = require('@playwright/test');
const projectPath = process.env.SLATEFRAME_PROJECT_PATH;
const width = (info) => info.project.use.viewport?.width || 0;
const columns = (chosen, w) => w <= 640 ? 1 : w <= 900 ? Math.min(2, chosen) : chosen;

async function openTemplate(page) {
  await page.goto(projectPath, { waitUntil: 'domcontentloaded' });
  const list = page.locator('.slateframe-project-grid .wp-block-post-template').first();
  await expect(list).toBeVisible();
  await expect(list.locator(':scope > .wp-block-post').first()).toBeVisible();
  return list;
}
async function metrics(list) {
  return list.evaluate((node) => ({
    display: getComputedStyle(node).display,
    tracks: getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
}

test('Core Query Loop respects columns 1–6 and mobile/tablet caps', async ({ page }, info) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  const list = await openTemplate(page);
  for (const chosen of [1, 2, 3, 4, 5, 6]) {
    await list.evaluate((node, count) => {
      for (const name of [...node.classList]) if (/^columns-[1-6]$/.test(name)) node.classList.remove(name);
      node.classList.add('columns-' + count);
    }, chosen);
    const actual = await metrics(list);
    expect(actual.display).toBe('grid');
    expect(actual.tracks, 'viewport ' + width(info) + ', columns ' + chosen).toBe(columns(chosen, width(info)));
    expect(actual.overflow).toBeLessThanOrEqual(1);
  }
});

test('Core is-layout-grid remains authoritative', async ({ page }) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  const list = await openTemplate(page);
  await list.evaluate((node) => {
    node.classList.remove('is-flex-container');
    node.classList.add('is-layout-grid');
    node.style.display = 'grid';
    node.style.gridTemplateColumns = 'repeat(2,minmax(0,1fr))';
  });
  const actual = await metrics(list);
  expect(actual.tracks).toBe(2);
  expect(actual.overflow).toBeLessThanOrEqual(1);
});

test('RTL/CJK and 200% text enlargement preserve grid boundaries', async ({ page }, info) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  const list = await openTemplate(page);
  await page.locator('html').evaluate((node) => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
  await list.evaluate((node) => {
    for (const name of [...node.classList]) if (/^columns-[1-6]$/.test(name)) node.classList.remove(name);
    node.classList.add('columns-6');
    node.querySelectorAll('.wp-block-post-title a').forEach((a) => {
      a.textContent = '日本語 العربية ' + 'unbroken-project-identifier-'.repeat(4);
    });
  });
  const actual = await metrics(list);
  expect(actual.tracks).toBe(columns(6, width(info)));
  expect(actual.overflow).toBeLessThanOrEqual(1);
});

test('native Core pagination keeps 44px targets in RTL and enlarged text', async ({ page }) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  await openTemplate(page);
  const nav = page.locator('.slateframe-project-grid .wp-block-query-pagination').first();
  await expect(nav).toBeVisible();
  for (const direction of ['ltr', 'rtl']) {
    for (const size of ['100%', '200%']) {
      await page.locator('html').evaluate((root, state) => {
        root.dir = state.direction;
        root.style.fontSize = state.size;
      }, { direction, size });
      const metrics = await nav.evaluate((node) => ({
        minTarget: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')),
        links: [...node.querySelectorAll('a[href]')].map((link) => {
          const box = link.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }),
        current: [...node.querySelectorAll('.page-numbers.current')].map((item) => ({
          tag: item.tagName, tabIndex: item.tabIndex,
        })),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(metrics.minTarget).toBeGreaterThanOrEqual(44);
      expect(metrics.links.length).toBeGreaterThan(0);
      expect(metrics.current.length).toBeGreaterThan(0);
      for (const link of metrics.links) {
        expect(link.width).toBeGreaterThanOrEqual(metrics.minTarget - 1);
        expect(link.height).toBeGreaterThanOrEqual(metrics.minTarget - 1);
      }
      for (const item of metrics.current) {
        expect(item.tag).not.toBe('A');
        expect(item.tabIndex).toBe(-1);
      }
      expect(metrics.overflow).toBeLessThanOrEqual(1);
    }
  }
});

test('native Core pagination navigates to a different real Portfolio page', async ({ page }) => {
  test.skip(!projectPath, 'Requires the real WordPress Portfolio fixture');
  await openTemplate(page);
  const nav = page.locator('.slateframe-project-grid .wp-block-query-pagination').first();
  await expect(nav).toBeVisible();
  const before = await page.locator('.slateframe-project-grid .wp-block-post-title').allTextContents();
  const link = nav.locator('a[href]').first();
  const destination = await link.getAttribute('href');
  expect(destination).toBeTruthy();
  await link.click();
  await expect(page.locator('.slateframe-project-grid .wp-block-post-template').first()).toBeVisible();
  const after = await page.locator('.slateframe-project-grid .wp-block-post-title').allTextContents();
  expect(after).not.toEqual(before);
});
