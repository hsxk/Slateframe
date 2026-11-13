const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

test('registered diagnostic decision log round-trips in real Gutenberg without invalid Core blocks', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress editor fixture covers the registered pattern');
  const markup = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-troubleshooting')['content'];");
  expect(markup).toContain('slateframe-knowledge-troubleshooting');
  const postId = wp('post', 'create', '--post_type=page', '--post_status=draft',
    '--post_title=Slateframe diagnostic decision log fixture', '--post_content=' + markup, '--porcelain');
  try {
    await openAuthenticatedEditor(page, postId);
    const evidence = await page.evaluate(() => {
      const editor = window.wp.data.select('core/block-editor');
      const core = window.wp.blocks;
      if (!editor?.getBlocks || !core?.serialize || !core?.parse) {
        throw new Error('Real Gutenberg block APIs unavailable');
      }
      const original = editor.getBlocks();
      const flatten = (blocks) => blocks.flatMap(block => [block, ...flatten(block.innerBlocks || [])]);
      const first = core.serialize(original);
      const parsed = core.parse(first);
      const second = core.serialize(parsed);
      const all = flatten(original);
      return {
        first, second,
        names: all.map(block => block.name),
        invalid: all.filter(block => block.isValid === false).map(block => block.name),
        missing: all.filter(block => block.name === 'core/missing').length,
        tables: all.filter(block => block.name === 'core/table').length,
        tableMarkup: first.slice(first.indexOf('<figure class="wp-block-table">'), first.indexOf('</figure>') + '</figure>'.length),
      };
    });
    expect(evidence.invalid).toEqual([]);
    expect(evidence.missing).toBe(0);
    expect(evidence.tables).toBe(1);
    expect(evidence.names.filter(name => name === 'core/heading')).toHaveLength(4);
    expect(evidence.second).toBe(evidence.first);
    expect(evidence.tableMarkup).toContain('<thead>');
    expect(evidence.tableMarkup).toContain('<figcaption');
    expect(evidence.tableMarkup.match(/<tr>/g)).toHaveLength(3);

    const framed = await page.locator('iframe[name="editor-canvas"]').count() > 0;
    const canvas = framed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
    const log = canvas.locator('.slateframe-knowledge-troubleshooting').first();
    await expect(log).toBeVisible();
    await expect(log.locator('table')).toBeVisible();
    await expect(log.locator('figcaption')).toBeVisible();
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await log.screenshot({ path: 'test-artifacts/screenshots/gutenberg-diagnostic-decision-log-390.png' });

    // Exercise persistence through the real editor, not just in-memory block serialization.
    const marker = 'Slateframe verified after editor reload';
    await page.evaluate(async (text) => {
      const select = window.wp.data.select('core/block-editor');
      const dispatch = window.wp.data.dispatch('core/block-editor');
      const flatten = (blocks) => blocks.flatMap(block => [block, ...flatten(block.innerBlocks || [])]);
      const paragraph = flatten(select.getBlocks()).find(block => block.name === 'core/paragraph');
      if (!paragraph) throw new Error('Diagnostic pattern has no editable paragraph');
      dispatch.updateBlockAttributes(paragraph.clientId, { content: text });
      await window.wp.data.dispatch('core/editor').savePost();
    }, marker);
    await expect.poll(() => {
      const saved = wp('post', 'get', postId, '--field=post_content');
      return {
        marker: saved.includes(marker),
        table: saved.includes('<!-- wp:table'),
        header: saved.includes('<thead>'),
        caption: saved.includes('<figcaption'),
        headings: (saved.match(/<!-- wp:heading\b/g) || []).length,
      };
    }).toEqual({ marker: true, table: true, header: true, caption: true, headings: 4 });
    await page.reload();
    await expect.poll(async () => page.evaluate(() => {
      const editor = window.wp?.data?.select('core/block-editor');
      if (!editor?.getBlocks) return { found: false, invalid: ['not-loaded'] };
      const flatten = (blocks) => blocks.flatMap(block => [block, ...flatten(block.innerBlocks || [])]);
      const blocks = flatten(editor.getBlocks());
      return {
        found: blocks.some(block => block.name === 'core/paragraph' && String(block.attributes?.content || '').includes('Slateframe verified after editor reload')),
        invalid: blocks.filter(block => block.isValid === false || block.name === 'core/missing').map(block => block.name),
      };
    })).toEqual({ found: true, invalid: [] });
    // Reload may change the editor canvas mode; resolve the current frame afresh.
    const reopenedFrame = await page.locator('iframe[name="editor-canvas"]').count() > 0;
    const reopened = reopenedFrame ? page.frameLocator('iframe[name="editor-canvas"]') : page;
    const reopenedLog = reopened.locator('.slateframe-knowledge-troubleshooting').first();
    await expect(reopenedLog.locator('table')).toBeVisible();
    await expect(reopenedLog.locator('figcaption')).toBeVisible();
    // Reopened Core Table must remain horizontally navigable at the narrow viewport.
    // Check actual layout rather than inferring scrolling from a CSS declaration.
    const reopenedTable = reopenedLog.locator('.wp-block-table').first();
    await expect(reopenedTable).toBeVisible();
    const tableLayout = await reopenedTable.evaluate(element => ({
      viewport: element.clientWidth,
      content: element.scrollWidth,
      overflow: getComputedStyle(element).overflowX,
    }));
    expect(tableLayout.viewport).toBeGreaterThan(0);
    expect(tableLayout.content).toBeGreaterThanOrEqual(tableLayout.viewport);
    if (tableLayout.content > tableLayout.viewport) {
      expect(['auto', 'scroll']).toContain(tableLayout.overflow);
      const moved = await reopenedTable.evaluate(element => {
        element.scrollLeft = element.scrollWidth;
        return Math.abs(element.scrollLeft) > 0;
      });
      expect(moved).toBe(true);
      // Restore the start edge before taking the persisted-content screenshot.
      const restored = await reopenedTable.evaluate(element => {
        element.scrollLeft = 0;
        return element.scrollLeft === 0;
      });
      expect(restored).toBe(true);
    }
    await reopenedLog.screenshot({
      path: 'test-artifacts/screenshots/gutenberg-diagnostic-reopened-390.png',
    });

    // A persisted edit must not damage the diagnostic table or its heading structure.
    const persisted = await page.evaluate(() => {
      const editor = window.wp.data.select('core/block-editor');
      const core = window.wp.blocks;
      const flatten = (blocks) => blocks.flatMap(block => [block, ...flatten(block.innerBlocks || [])]);
      const blocks = flatten(editor.getBlocks());
      const serialized = core.serialize(editor.getBlocks());
      return {
        headings: blocks.filter(block => block.name === 'core/heading').length,
        tables: blocks.filter(block => block.name === 'core/table').length,
        invalid: blocks.filter(block => block.isValid === false || block.name === 'core/missing').length,
        stable: core.serialize(core.parse(serialized)) === serialized,
        hasCaption: serialized.includes('<figcaption'),
        hasHeader: serialized.includes('<thead>'),
      };
    });
    expect(persisted).toEqual({
      headings: 4, tables: 1, invalid: 0, stable: true, hasCaption: true, hasHeader: true,
    });
  } finally {
    wp('post', 'delete', postId, '--force');
  }
});
