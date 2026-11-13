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
        tableMarkup: first.match(/<figure class="wp-block-table">[\\s\\S]*?<\\/figure>/)?.[0] || '',
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
  } finally {
    wp('post', 'delete', postId, '--force');
  }
});
