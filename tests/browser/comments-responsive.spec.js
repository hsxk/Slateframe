const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const widthOf = (info) => info.project.use.viewport?.width || 1440;

test('nested Core comments remain readable at text zoom and RTL without horizontal page overflow', async ({ page }, info) => {
  await page.goto(pagePath, { waitUntil: 'networkidle' });
  const comments = page.locator('#comments');
  const parent = comments.locator('.slateframe-comment-list > .comment').first();
  const nested = parent.locator('.children .comment').first();
  await expect(parent).toBeVisible();
  await expect(nested).toBeVisible();
  const reply = comments.locator('.comment-reply-link').first();
  const consent = comments.locator('.comment-form-cookies-consent label');
  const header = page.locator('[data-site-header]');
  for (const dir of ['ltr', 'rtl']) {
    await page.locator('html').evaluate((element, value) => { element.dir = value; }, dir);
    for (const zoom of [100, 200]) {
      await page.locator('html').evaluate((element, value) => { element.style.fontSize = value + '%'; }, zoom);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(layout.overflow, widthOf(info) + 'px ' + dir + ' ' + zoom + '%').toBeLessThanOrEqual(1);
      for (const comment of [parent, nested]) {
        const rect = await comment.boundingBox();
        expect(rect?.width || 0).toBeGreaterThan(0);
        expect(rect?.width || 0).toBeLessThanOrEqual(layout.viewport + 1);
        const margin = await comment.evaluate((element) => parseFloat(getComputedStyle(element).scrollMarginBlockStart));
        const headerHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
        expect(margin, 'comment permalink must clear sticky header').toBeGreaterThanOrEqual(headerHeight);
      }
      if (await reply.count()) {
        const rect = await reply.boundingBox();
        expect(rect?.height || 0).toBeGreaterThanOrEqual(44);
      }
      if (await consent.count()) {
        const rect = await consent.boundingBox();
        expect(rect?.height || 0).toBeGreaterThanOrEqual(44);
      }
      if (zoom === 200 && dir === 'rtl' && [320, 390, 1440].includes(widthOf(info))) {
        const output = path.resolve('test-artifacts/screenshots');
        await fs.mkdir(output, { recursive: true });
        await comments.screenshot({ path: path.join(output, 'comments-' + info.project.name + '-rtl-200.png'), animations: 'disabled' });
      }
    }
  }
});

test('comment permalink target remains clear of sticky navigation', async ({ page }, info) => {
  test.skip(![390, 1440].includes(widthOf(info)));
  await page.goto(pagePath, { waitUntil: 'networkidle' });
  const target = page.locator('#comments .slateframe-comment-list > .comment').first();
  await expect(target).toBeVisible();
  const id = await target.getAttribute('id');
  expect(id).toMatch(/^comment-\d+$/);
  await page.goto(pagePath + '#' + id, { waitUntil: 'networkidle' });
  const top = await page.locator('#' + id).evaluate((element) => element.getBoundingClientRect().top);
  const headerHeight = await page.locator('[data-site-header]').evaluate((element) => element.getBoundingClientRect().height);
  expect(top).toBeGreaterThanOrEqual(headerHeight - 2);
});
