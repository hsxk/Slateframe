const { test, expect } = require('@playwright/test');
const { openAuthenticatedEditor } = require('./support/editor-login');

const editorPostId = process.env.SLATEFRAME_EDITOR_POST_ID;

test('Knowledge procedure text stays within the real Gutenberg canvas in RTL and LTR', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport?.width;
  test.skip(!editorPostId || ![390, 1440].includes(width), 'Requires the real WordPress editor fixture at mobile or desktop width.');

  await openAuthenticatedEditor(page, editorPostId);
  const framed = (await page.locator('iframe[name="editor-canvas"]').count()) > 0;
  const canvas = framed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
  const knowledge = canvas.locator('.slateframe-knowledge-procedure').first();
  await expect(knowledge).toBeVisible();

  for (const direction of ['ltr', 'rtl']) {
    await knowledge.evaluate((node, dir) => {
      node.dir = dir;
      const paragraph = node.querySelector('p');
      if (paragraph) {
        paragraph.textContent = 'العربية 中文 日本語 — a deliberately long multilingual authoring sentence that must wrap inside the Gutenberg canvas without widening it';
      }
    }, direction);

    await knowledge.scrollIntoViewIfNeeded();
    const metrics = await knowledge.evaluate((node) => {
      const region = node.getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      const targets = [
        node.querySelector('h2'),
        node.querySelector('p'),
        ...node.querySelectorAll('.is-style-slateframe-steps > li'),
        ...node.querySelectorAll('.is-style-slateframe-checklist > li'),
      ].filter(Boolean);
      const fragments = targets.flatMap((target) => {
        const range = document.createRange();
        range.selectNodeContents(target);
        return [...range.getClientRects()]
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => ({ left: rect.left, right: rect.right }));
      });
      return {
        region: { left: region.left, right: region.right, width: region.width },
        viewport,
        direction: getComputedStyle(node).direction,
        overflow: document.documentElement.scrollWidth - viewport,
        fragments,
      };
    });
    const label = `${width}px ${direction}`;
    expect(metrics.direction, label).toBe(direction);
    expect(metrics.overflow, label).toBeLessThanOrEqual(1);
    expect(metrics.region.width, label).toBeGreaterThan(0);
    expect(metrics.region.left, label).toBeGreaterThanOrEqual(-2);
    expect(metrics.region.right, label).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.fragments.length, label).toBeGreaterThan(5);
    for (const fragment of metrics.fragments) {
      expect(fragment.left, `${label} text left`).toBeGreaterThanOrEqual(metrics.region.left - 2);
      expect(fragment.right, `${label} text right`).toBeLessThanOrEqual(metrics.region.right + 2);
    }
  }
});
