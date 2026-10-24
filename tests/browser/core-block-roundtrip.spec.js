const { test, expect } = require('@playwright/test');
const { openAuthenticatedEditor } = require('./support/editor-login');

const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
const viewportWidth = (info) => info.project.use.viewport?.width || 1440;

test('real Gutenberg Core File, Verse and Code round-trip without editing the post', async ({ page }, info) => {
  test.skip(!postId || ![390, 1440].includes(viewportWidth(info)),
    'The disposable WordPress editor fixture runs at mobile and desktop widths.');
  await openAuthenticatedEditor(page, postId);

  const evidence = await page.evaluate(() => {
    const blockEditor = window.wp.data.select('core/block-editor');
    const postEditor = window.wp.data.select('core/editor');
    const blocks = window.wp.blocks;
    if (!blockEditor?.getBlocks || !blocks?.createBlock || !blocks?.serialize || !blocks?.parse) {
      throw new Error('WordPress Core block APIs are unavailable');
    }
    const snapshot = () => ({
      ids: blockEditor.getBlocks().map((block) => block.clientId),
      markup: blocks.serialize(blockEditor.getBlocks()),
      dirty: postEditor?.isEditedPostDirty?.(),
    });
    const before = snapshot();
    const cases = [
      {
        name: 'core/file',
        attributes: {
          href: '/wp-content/uploads/slateframe-fixtures/guide.pdf',
          fileName: '日本語 中文 العربية — guide.pdf',
          showDownloadButton: true,
        },
      },
      { name: 'core/verse', attributes: { content: '日本語 — 中文\nالعربية — Korean 한국어' } },
      { name: 'core/code', attributes: { content: 'const label = "日本語 中文 العربية";' } },
    ];
    const results = cases.map(({ name, attributes }) => {
      if (!blocks.getBlockType(name)) throw new Error(`Missing native ${name} registration`);
      const created = blocks.createBlock(name, attributes);
      const first = blocks.serialize(created);
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      return {
        name,
        first,
        second,
        parsedName: parsed[0]?.name,
        parsedValid: parsed[0]?.isValid,
        parsedAttributes: parsed[0]?.attributes,
        parsedCount: parsed.length,
        saveElement: Boolean(blocks.getSaveContent(name, attributes)),
      };
    });
    return { before, after: snapshot(), results };
  });

  expect(evidence.after).toEqual(evidence.before);
  expect(evidence.results.map((result) => result.name)).toEqual(['core/file', 'core/verse', 'core/code']);
  for (const result of evidence.results) {
    expect(result.parsedCount, result.name).toBe(1);
    expect(result.parsedName, result.name).toBe(result.name);
    expect(result.parsedValid, `${result.name} must be valid Core markup`).toBe(true);
    expect(result.saveElement, result.name).toBe(true);
    expect(result.second, `${result.name} must serialize deterministically`).toBe(result.first);
    expect(result.first, result.name).toContain('日本語');
    expect(result.first, result.name).toContain('العربية');
    expect(result.first, result.name).toMatch(/<!-- wp:(file|verse|code)/);
    expect(result.first, result.name).toMatch(/<!-- \/wp:(file|verse|code) -->/);
  }
  const [file, verse, code] = evidence.results;
  expect(file.parsedAttributes.href).toBe('/wp-content/uploads/slateframe-fixtures/guide.pdf');
  expect(file.parsedAttributes.fileName).toContain('日本語 中文 العربية');
  expect(file.parsedAttributes.showDownloadButton).toBe(true);
  expect(verse.parsedAttributes.content).toContain('日本語 — 中文');
  expect(verse.parsedAttributes.content).toContain('العربية — Korean 한국어');
  expect(code.parsedAttributes.content).toContain('const label =');
  expect(code.parsedAttributes.content).toContain('日本語 中文 العربية');
});
