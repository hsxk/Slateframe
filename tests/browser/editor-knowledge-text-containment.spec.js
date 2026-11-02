const { test, expect } = require('@playwright/test');
const { openAuthenticatedEditor } = require('./support/editor-login');

const editorPostId = process.env.SLATEFRAME_EDITOR_POST_ID;
const supportedWidths = [320, 375, 390, 412, 768, 1440, 1920];

test('Knowledge procedure text fragments stay inside the real Gutenberg canvas in RTL and LTR', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport?.width;
  test.skip(!editorPostId || !supportedWidths.includes(width), 'Requires the real WordPress editor fixture at a supported viewport.');

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
      const fragments = [];
      let textNodes = 0;
      for (const target of targets) {
        // Range.selectNodeContents(element) can return element boxes rather than
        // glyph geometry. Measure actual text nodes so clipped text cannot pass.
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const textNode = walker.currentNode;
          if (!textNode.textContent.trim()) continue;
          textNodes += 1;
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of range.getClientRects()) {
            if (rect.width > 0 && rect.height > 0) {
              fragments.push({
                left: rect.left,
                right: rect.right,
                source: target.tagName.toLowerCase(),
                text: textNode.textContent.trim().slice(0, 72),
              });
            }
          }
        }
      }
      return {
        region: { left: region.left, right: region.right, width: region.width },
        viewport,
        direction: getComputedStyle(node).direction,
        overflow: document.documentElement.scrollWidth - viewport,
        textNodes,
        fragments,
      };
    });
    const label = `${width}px ${direction}`;
    expect(metrics.direction, label).toBe(direction);
    expect(metrics.overflow, label).toBeLessThanOrEqual(1);
    expect(metrics.region.width, label).toBeGreaterThan(0);
    expect(metrics.region.left, label).toBeGreaterThanOrEqual(-2);
    expect(metrics.region.right, label).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.textNodes, label).toBeGreaterThan(5);
    expect(metrics.fragments.length, label).toBeGreaterThanOrEqual(metrics.textNodes);
    for (const fragment of metrics.fragments) {
      const context = `${label} ${fragment.source} ${fragment.text}`;
      expect(fragment.left, `${context} glyph left`).toBeGreaterThanOrEqual(metrics.region.left - 2);
      expect(fragment.right, `${context} glyph right`).toBeLessThanOrEqual(metrics.region.right + 2);
      expect(fragment.left, `${context} viewport left`).toBeGreaterThanOrEqual(-2);
      expect(fragment.right, `${context} viewport right`).toBeLessThanOrEqual(metrics.viewport + 2);
    }
  }
});
