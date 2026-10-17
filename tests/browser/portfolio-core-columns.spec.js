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
