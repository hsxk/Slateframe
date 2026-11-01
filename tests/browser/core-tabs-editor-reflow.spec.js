const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const { setRootTextScale } = require('./support/root-text-scale');
const { canonicalizeCoreQueryDefaults } = require('./support/core-query-defaults');

// A disposable native block in the real Gutenberg iframe, never saved to the post.
test('Core Tabs editor controls reflow at 400% RTL without changing saved content', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  const width = info.project.use.viewport?.width;
  test.skip(!postId || ![390, 1440].includes(width), 'Real Gutenberg mobile/desktop fixture');
  test.setTimeout(120000);
  await openAuthenticatedEditor(page, postId);
  // Compare the complete serialized post, original client IDs and dirty flag.
  // Core may add the semantically empty Query Loop excludeCurrent:null default
  // when Gutenberg's editor state is refreshed by a disposable block undo.
  const readSnapshot = async () => {
    const snapshot = await page.evaluate(() => {
      const editor = window.wp.data.select('core/block-editor');
      return {
        content: window.wp.blocks.serialize(editor.getBlocks()),
        ids: editor.getBlocks().map(block => block.clientId),
        dirty: Boolean(window.wp.data.select('core/editor').isEditedPostDirty()),
      };
    });
    return { ...snapshot, content: canonicalizeCoreQueryDefaults(snapshot.content) };
  };
  const baseline = await readSnapshot();
  let canvas;
  await expect.poll(async () => {
    for (const frame of page.frames()) {
      if (await frame.locator('.editor-styles-wrapper').count().catch(() => 0)) {
        canvas = frame;
        return true;
      }
    }
    return false;
  }, { timeout: 15000 }).toBe(true);
  await setRootTextScale(canvas, 64, 'rtl');
  const baselineOverflow = await canvas.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const clientId = await page.evaluate(() => {
    const { createBlock } = window.wp.blocks;
    const label = '日本語 中文 العربية ' + 'UnbrokenNativeTabLabel'.repeat(4);
    const tabs = createBlock('core/tabs', {}, [
      createBlock('core/tab-list'),
      createBlock('core/tab-panels', {}, [
        createBlock('core/tab-panel', { label }, [
          createBlock('core/paragraph', { content: 'Native first panel' }),
        ]),
        createBlock('core/tab-panel', { label: 'Second / 次へ / التالي' }, [
          createBlock('core/paragraph', { content: 'Native second panel' }),
        ]),
      ]),
    ]);
    // Keep this insertion undoable: nonpersistent block changes can still leave
    // core/editor's post content dirty even after removing the temporary block.
    window.wp.data.dispatch('core/block-editor').insertBlocks(tabs);
    return tabs.clientId;
  });
  try {
    const block = canvas.locator('[data-block="' + clientId + '"]');
    await expect(block).toHaveCount(1);
    const tabs = block.locator(':scope.wp-block-tabs, .wp-block-tabs').first();
    await expect(tabs).toHaveCount(1);
    const controls = tabs.locator('.wp-block-tab-list [role="tab"]');
    await expect(controls).toHaveCount(2);
    // A viewport screenshot can show only the middle of a tab taller than the
    // Gutenberg canvas at 400% zoom. Preserve the complete rendered control
    // as independent evidence, and assert Core did not truncate its text.
    await expect(controls.first()).toContainText('UnbrokenNativeTabLabel'.repeat(4));
    await expect(controls.last()).toContainText('Second / 次へ / التالي');
    const measurements = await tabs.evaluate(node => {
      const root = document.documentElement;
      const box = node.getBoundingClientRect();
      const controls = [...node.querySelectorAll('.wp-block-tab-list [role="tab"]')]
        .map(button => {
          const rect = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          return { width: rect.width, height: rect.height, left: rect.left,
            right: rect.right, wrap: style.overflowWrap };
        });
      return { viewport: root.clientWidth, overflow: root.scrollWidth - root.clientWidth,
        font: parseFloat(getComputedStyle(root).fontSize),
        direction: getComputedStyle(root).direction,
        blockWidth: box.width, controls };
    });
    expect(measurements.font).toBe(64);
    expect(measurements.direction).toBe('rtl');
    expect(measurements.blockWidth).toBeLessThanOrEqual(measurements.viewport + 1);
    expect(measurements.overflow, 'Core Tabs must not add to existing Gutenberg chrome overflow')
      .toBeLessThanOrEqual(baselineOverflow + 1);
    for (const control of measurements.controls) {
      expect(control.width).toBeGreaterThanOrEqual(44);
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.width).toBeLessThanOrEqual(measurements.viewport + 1);
      expect(control.wrap).toBe('anywhere');
    }
    // At 390px/400%, the tab is taller than Gutenberg's scrollable canvas.
    // Playwright's element screenshot alone captured only the middle, with
    // editor chrome over the first lines. Give the native canvas enough height,
    // prove both edges fit, then restore the original viewport for context.
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    const originalViewport = page.viewportSize();
    const captureCompleteLabel = async path => {
      const tabHeight = await controls.first().evaluate(node =>
        Math.ceil(node.getBoundingClientRect().height));
      await page.setViewportSize({
        width: originalViewport.width,
        height: Math.max(originalViewport.height, tabHeight + 480),
      });
      try {
        await controls.first().scrollIntoViewIfNeeded();
        const visible = await controls.first().evaluate(node => {
          const rect = node.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom,
            viewport: node.ownerDocument.defaultView.innerHeight };
        });
        expect(visible.top, 'full native label begins inside the editor viewport')
          .toBeGreaterThanOrEqual(-1);
        expect(visible.bottom, 'full native label ends inside the editor viewport')
          .toBeLessThanOrEqual(visible.viewport + 1);
        await controls.first().screenshot({ path, animations: 'disabled' });
      } finally {
        await page.setViewportSize(originalViewport);
      }
    };
    await captureCompleteLabel(
      'test-artifacts/screenshots/core-tabs-editor-' + width + '-rtl-400-complete-label.png');
    await controls.first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-artifacts/screenshots/core-tabs-editor-' + width + '-rtl-400.png',
      animations: 'disabled',
    });
    if (width === 390) {
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      const forced = await controls.first().evaluate(node => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height,
          color: getComputedStyle(node).color };
      });
      expect(forced.width).toBeGreaterThanOrEqual(44);
      expect(forced.height).toBeGreaterThanOrEqual(44);
      await captureCompleteLabel(
        'test-artifacts/screenshots/core-tabs-editor-390-rtl-400-complete-label-forced-colors.png');
      await controls.first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: 'test-artifacts/screenshots/core-tabs-editor-390-rtl-400-forced-colors.png',
        animations: 'disabled',
      });
    }
  } finally {
    await page.evaluate(id => {
      // Undo the actual post edit, not merely its block-tree effect. WordPress
      // core-data tracks dirty content separately from serialized block equality.
      if (window.wp.data.select('core/block-editor').getBlock(id)) {
        window.wp.data.dispatch('core/editor').undo();
      }
    }, clientId);
    await expect.poll(readSnapshot).toEqual(baseline);
  }
});
