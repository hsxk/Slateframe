const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test.beforeEach(({}, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real Core Freeform fixture covers all seven widths.');
});

test('Core Freeform scroll stops preserve author HTML and Verse semantics', async () => {
  const script = [
    '$cases = array(',
    "'bare' => '<pre>Source</pre><table><tr><td>Data</td></tr></table>',",
    "'authored' => '<pre tabindex=\"-1\">Source</pre><table tabindex=\"2\"><tr><td>Data</td></tr></table>',",
    "'verse' => '<pre class=\"wp-block-verse\">Verse</pre>',",
    "'lookalike' => '<p>Written &lt;pre&gt; is not markup.</p>',",
    '); $out = array();',
    'foreach ( $cases as $key => $html ) {',
    " $rendered = apply_filters( 'render_block_core/freeform', $html );",
    ' $processor = new WP_HTML_Tag_Processor( $rendered ); $tabs = array();',
    ' while ( $processor->next_tag() ) {',
    "  if ( in_array( $processor->get_tag(), array( 'PRE', 'TABLE' ), true ) ) {",
    "   $tabs[] = $processor->get_attribute( 'tabindex' );",
    '  }',
    ' }',
    " $out[ $key ] = array( 'tabs' => $tabs, 'unchanged' => $html === $rendered );",
    '} echo wp_json_encode( $out );',
  ].join(' ');
  const result = JSON.parse(wp('eval', script));
  expect(result.bare.tabs).toEqual(['0', '0']);
  expect(result.authored).toEqual({ tabs: ['-1', '2'], unchanged: true });
  expect(result.verse).toEqual({ tabs: [null], unchanged: true });
  expect(result.lookalike).toEqual({ tabs: [], unchanged: true });
});

test('Classic block PRE and TABLE remain keyboard-scrollable at mobile zoom and RTL', async ({ page }) => {
  test.setTimeout(120_000);
  const preText = '0123456789abcdef'.repeat(35) + ' 日本語 中文 العربية';
  const columns = Array.from({ length: 6 }, (_, i) => '<th>Column ' + (i + 1) + ' 日本語</th>').join('');
  const values = Array.from({ length: 6 }, (_, i) => '<td>Value ' + (i + 1) + ' العربية</td>').join('');
  const content = '<!-- wp:freeform --><pre>' + preText + '</pre>' +
    '<table><thead><tr>' + columns + '</tr></thead><tbody><tr>' + values +
    '</tr></tbody></table><!-- /wp:freeform -->';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Freeform keyboard scroll', '--post_content=' + content, '--porcelain');
  try {
    expect(wp('post', 'get', id, '--field=post_content')).not.toContain('tabindex=');
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const pre = page.locator('.slateframe-prose > pre').first();
    const table = page.locator('.slateframe-prose > table').first();
    await expect(pre).toHaveAttribute('tabindex', '0');
    await expect(table).toHaveAttribute('tabindex', '0');
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, value) => { node.dir = value; }, dir);
        const result = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          nodes: [...document.querySelectorAll('.slateframe-prose > pre, .slateframe-prose > table')].map(node => ({
            overflowX: getComputedStyle(node).overflowX,
            scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
          })),
        }));
        expect(result.overflow, width + ' ' + dir).toBeLessThanOrEqual(1);
        expect(result.nodes).toHaveLength(2);
        for (const node of result.nodes) {
          expect(node.overflowX).toBe('auto');
          if (width <= 412) expect(node.scrollWidth).toBeGreaterThan(node.clientWidth + 20);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(root => { root.dir = 'ltr'; root.style.fontSize = '200%'; });
    for (const size of ['200%', '400%']) {
      await page.locator('html').evaluate((root, value) => { root.style.fontSize = value; }, size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
    await page.locator('html').evaluate(root => { root.style.fontSize = '200%'; });
    for (const node of [pre, table]) {
      await node.focus();
      await expect(node).toBeFocused();
      await node.evaluate(el => { el.scrollLeft = 0; });
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => node.evaluate(el => el.scrollLeft), { timeout: 4000 }).toBeGreaterThan(0);
    }
    await page.emulateMedia({ forcedColors: 'active' });
    for (const node of [pre, table]) {
      await node.focus();
      expect(await node.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    }
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await table.screenshot({ path: 'test-artifacts/screenshots/core-freeform-scroll-390.png' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.locator('html').evaluate(root => { root.style.fontSize = ''; });
    await page.setViewportSize({ width: 1440, height: 900 });
    await pre.screenshot({ path: 'test-artifacts/screenshots/core-freeform-pre-1440.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
