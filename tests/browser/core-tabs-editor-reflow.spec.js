const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const { setRootTextScale } = require('./support/root-text-scale');

// A disposable native block in the real Gutenberg iframe, never saved to the post.
test('Core Tabs editor controls reflow at 400% RTL without changing saved content', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  const width = info.project.use.viewport?.width;
  test.skip(!postId || ![390, 1440].includes(width), 'Real Gutenberg mobile/desktop fixture');
  test.setTimeout(120000);
  await openAuthenticatedEditor(page, postId);
  const baseline = await page.evaluate(() => {
    const editor = window.wp.data.select('core/block-editor');
    return {
      content: window.wp.blocks.serialize(editor.getBlocks()),
      ids: editor.getBlocks().map(block => block.clientId),
    };
  });
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
    // WordPress editor chrome can already overflow at 400% independently of Tabs.
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
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
      await controls.first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: 'test-artifacts/screenshots/core-tabs-editor-390-rtl-400-forced-colors.png',
        animations: 'disabled',
      });
    }
  } finally {
    await page.evaluate(id => {
      window.wp.data.dispatch('core/block-editor').removeBlocks(id);
    }, clientId);
    await expect.poll(() => page.evaluate(() => {
      const editor = window.wp.data.select('core/block-editor');
      return {
        content: window.wp.blocks.serialize(editor.getBlocks()),
        ids: editor.getBlocks().map(block => block.clientId),
      };
    })).toEqual(baseline);
  }
});
