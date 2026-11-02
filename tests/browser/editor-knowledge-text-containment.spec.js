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

test('Knowledge Gutenberg glyphs remain visible at 400% in both writing directions', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport?.width;
  test.skip(!editorPostId || ![390, 1440].includes(width), 'Requires the real WordPress editor fixture at mobile or desktop width.');

  await openAuthenticatedEditor(page, editorPostId);
  const framed = (await page.locator('iframe[name="editor-canvas"]').count()) > 0;
  const canvas = framed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
  const knowledge = canvas.locator('.slateframe-knowledge-procedure').first();
  await expect(knowledge).toBeVisible();
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });

  // Gutenberg's editor shell contains Core controls and unrelated fixture blocks.
  // Enlarging the iframe root can make those Core surfaces wider than the iframe,
  // even when the Slateframe procedure itself is fully contained. Capture that
  // shell overflow before mutating theme content, and assert no *additional*
  // overflow while retaining strict glyph and procedure bounds below.
  const editorShellBaseline = await knowledge.evaluate((node) => {
    const root = node.ownerDocument.documentElement;
    root.style.fontSize = '64px';
    return Math.max(0, root.scrollWidth - root.clientWidth);
  });

  for (const direction of ['ltr', 'rtl']) {
    await knowledge.evaluate((node, dir) => {
      node.dir = dir;
      const paragraph = node.querySelector('p');
      if (paragraph) {
        paragraph.textContent = 'العربية 中文 日本語 — a long multilingual authoring sentence that must wrap without clipped glyphs at 400 percent';
      }
    }, direction);
    await knowledge.scrollIntoViewIfNeeded();

    const metrics = await knowledge.evaluate((node) => {
      const root = node.ownerDocument.documentElement;
      const viewport = root.clientWidth;
      const region = node.getBoundingClientRect();
      const walker = node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const escaped = [];
      let measured = 0;
      while (walker.nextNode()) {
        const text = walker.currentNode;
        if (!text.textContent.trim()) continue;
        const range = node.ownerDocument.createRange();
        range.selectNodeContents(text);
        for (const rect of range.getClientRects()) {
          if (!rect.width || !rect.height) continue;
          measured += 1;
          if (rect.left < Math.max(-2, region.left - 2) ||
              rect.right > Math.min(viewport + 2, region.right + 2)) {
            escaped.push({ text: text.textContent.trim().slice(0, 72), left: rect.left, right: rect.right });
          }
        }
      }
      return {
        rootFont: getComputedStyle(root).fontSize,
        direction: getComputedStyle(node).direction,
        viewport,
        region: { left: region.left, right: region.right },
        overflow: root.scrollWidth - viewport,
        procedureOverflow: node.scrollWidth - node.clientWidth,
        measured,
        escaped,
      };
    });

    const label = `${width}px ${direction} at 400%`;
    // Attach the failing direction's actual screenshot and measurements before
    // assertions, so CI failures preserve evidence instead of only a trace.
    await testInfo.attach(`knowledge-editor-${width}-${direction}-400-metrics`, {
      body: Buffer.from(JSON.stringify({ editorShellBaseline, ...metrics }, null, 2)),
      contentType: 'application/json',
    });
    await testInfo.attach(`knowledge-editor-${width}-${direction}-400-forced-colors`, {
      body: await knowledge.screenshot(),
      contentType: 'image/png',
    });
    expect(metrics.rootFont, label).toBe('64px');
    expect(metrics.direction, label).toBe(direction);
    expect(metrics.measured, label).toBeGreaterThan(8);
    expect(metrics.procedureOverflow, `${label} procedure overflow`).toBeLessThanOrEqual(1);
    expect(metrics.overflow, `${label} editor shell delta (baseline ${editorShellBaseline}px)`).toBeLessThanOrEqual(editorShellBaseline + 1);
    expect(metrics.region.left, label).toBeGreaterThanOrEqual(-2);
    expect(metrics.region.right, label).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.escaped, label).toEqual([]);

  }
});
