const { test, expect } = require('@playwright/test');
const { openAuthenticatedEditor } = require('./support/editor-login');

test('Core Tabs remain native, portable Gutenberg blocks across editor widths', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture on representative mobile/desktop viewports');
  test.setTimeout(120_000);
  await openAuthenticatedEditor(page, postId);

  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const required = ['core/tabs', 'core/tab-list', 'core/tab-panels', 'core/tab-panel'];
    const registered = required.map(name => Boolean(blocks.getBlockType(name)));
    if (registered.some(value => !value)) {
      return { registered, before, after: blocks.serialize(editor.getBlocks()) };
    }
    const created = blocks.createBlock('core/tabs', {}, [
      blocks.createBlock('core/tab-list'),
      blocks.createBlock('core/tab-panels', {}, [
        blocks.createBlock('core/tab-panel', { label: '日本語 中文 العربية' }, [
          blocks.createBlock('core/paragraph', { content: 'First native panel / 第一部分' }),
        ]),
        blocks.createBlock('core/tab-panel', { label: 'Second / 次へ / التالي' }, [
          blocks.createBlock('core/paragraph', { content: 'Second native panel / 第二部分' }),
        ]),
      ]),
    ]);
    const serialized = blocks.serialize(created);
    const parsed = blocks.parse(serialized);
    const first = parsed[0];
    return {
      registered,
      before,
      after: blocks.serialize(editor.getBlocks()),
      serialized,
      roundtrip: blocks.serialize(parsed),
      valid: first?.isValid,
      names: [first?.name, first?.innerBlocks[0]?.name,
        first?.innerBlocks[1]?.name, first?.innerBlocks[1]?.innerBlocks[0]?.name,
        first?.innerBlocks[1]?.innerBlocks[1]?.name],
      panelLabels: first?.innerBlocks[1]?.innerBlocks.map(panel => panel.attributes.label),
    };
  });

  expect(result.registered).toEqual([true, true, true, true]);
  expect(result.after).toBe(result.before);
  expect(result.valid).toBe(true);
  expect(result.names).toEqual(['core/tabs', 'core/tab-list', 'core/tab-panels',
    'core/tab-panel', 'core/tab-panel']);
  expect(result.panelLabels).toEqual(['日本語 中文 العربية', 'Second / 次へ / التالي']);
  expect(result.roundtrip).toBe(result.serialized);
  // Gutenberg omits the `core/` namespace in serialized HTML block comments.
  // Assert the actual portable Core grammar, not the registry's qualified name.
  expect(result.serialized).toContain('<!-- wp:tabs -->');
  expect(result.serialized).toContain('<!-- wp:tab-list -->');
  expect(result.serialized).toContain('<!-- wp:tab-panels -->');
  expect(result.serialized.match(/<!-- wp:tab-panel(?:\s|-->)/g)).toHaveLength(2);
  expect(result.serialized).not.toContain('<!-- wp:slateframe/');
});
