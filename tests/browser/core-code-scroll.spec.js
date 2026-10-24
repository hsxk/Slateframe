const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test.beforeEach(({}, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers the seven-width matrix.');
});

test('Core code and preformatted roots gain a focus stop without overriding authors', async () => {
  const cases = JSON.parse(wp('eval', `
    $cases = array(
      'code' => '<pre class="wp-block-code"><code>code</code></pre>',
      'preformatted' => '<pre class="wp-block-preformatted">text</pre>',
      'author' => '<pre class="wp-block-code" tabindex="-1"><code>author</code></pre>',
      'author_preformatted' => '<pre class="wp-block-preformatted" tabindex="2">authored</pre>',
      'ordinary' => '<pre>ordinary</pre>',
      'lookalike' => '<pre class="wp-block-code-other">lookalike</pre>',
      'nonroot' => '<div class="wp-block-code"><pre>nested</pre></div>',
      'verse' => '<pre class="wp-block-verse">verse</pre>',
    );
    $out = array();
    foreach ( $cases as $key => $html ) {
      $hook = in_array( $key, array( 'preformatted', 'author_preformatted' ), true ) ? 'render_block_core/preformatted' : 'render_block_core/code';
      $rendered = apply_filters( $hook, $html );
      $processor = new WP_HTML_Tag_Processor( $rendered );
      $processor->next_tag();
      $out[ $key ] = array(
        'tabindex' => $processor->get_attribute( 'tabindex' ),
        'unchanged' => $html === $rendered,
        'text' => wp_strip_all_tags( $rendered ),
      );
    }
    echo wp_json_encode( $out );
  `));
  for (const key of ['code', 'preformatted']) {
    expect(cases[key].tabindex).toBe('0');
    expect(cases[key].unchanged).toBe(false);
  }
  expect(cases.author).toMatchObject({ tabindex: '-1', unchanged: true });
  expect(cases.author_preformatted).toMatchObject({ tabindex: '2', unchanged: true });
  for (const key of ['ordinary', 'lookalike', 'nonroot', 'verse']) {
    expect(cases[key].tabindex, key).toBeNull();
    expect(cases[key].unchanged, key).toBe(true);
  }
  for (const value of Object.values(cases)) expect(value.text.length).toBeGreaterThan(0);
});

test('native preformatted content stays readable and keyboard reachable across directions and zoom', async ({ page }) => {
  test.setTimeout(120_000);
  const content = '<!-- wp:preformatted --><pre class="wp-block-preformatted">' +
    '0123456789abcdef'.repeat(35) + ' 日本語 中文 العربية' +
    '</pre><!-- /wp:preformatted -->' +
    '<!-- wp:code --><pre class="wp-block-code"><code>' +
    'const editorial = "Slateframe"; '.repeat(18) +
    '</code></pre><!-- /wp:code -->';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core code scroll regression', '--post_content=' + content, '--porcelain');
  try {
    expect(wp('post', 'get', id, '--field=post_content')).not.toContain('tabindex=');
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const pre = page.locator('.slateframe-prose pre.wp-block-preformatted').first();
    const code = page.locator('.slateframe-prose pre.wp-block-code').first();
    await expect(pre).toHaveAttribute('tabindex', '0');
    await expect(code).toHaveAttribute('tabindex', '0');
    // Simulate an author preserving fixed-width source lines in native Core Preformatted.
    await pre.evaluate(node => { node.style.whiteSpace = 'pre'; });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((root, direction) => { root.dir = direction; }, dir);
        const geometry = await pre.evaluate(node => ({
          rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          overflowX: getComputedStyle(node).overflowX,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          direction: getComputedStyle(node).direction,
        }));
        expect(geometry.rootOverflow, `${width} ${dir}`).toBeLessThanOrEqual(1);
        expect(geometry.overflowX).toBe('auto');
        expect(geometry.direction).toBe(dir);
        expect(await code.evaluate(node => getComputedStyle(node).direction)).toBe('ltr');
        if (width <= 412) expect(geometry.scrollWidth, `${width} ${dir}`).toBeGreaterThan(geometry.clientWidth + 20);
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(root => { root.dir = 'ltr'; root.style.fontSize = '200%'; });
    expect(await pre.evaluate(node => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.locator('html').evaluate(root => { root.style.fontSize = '400%'; });
    expect(await pre.evaluate(node => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.locator('html').evaluate(root => { root.style.fontSize = '200%'; });
    await pre.focus();
    await expect(pre).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => pre.evaluate(node => node.scrollLeft), {
      message: 'focused Core preformatted block should scroll with the keyboard', timeout: 4000,
    }).toBeGreaterThan(0);
    const focus = await pre.evaluate(node => ({
      outlineStyle: getComputedStyle(node).outlineStyle,
      outlineWidth: getComputedStyle(node).outlineWidth,
    }));
    expect(focus.outlineStyle).not.toBe('none');
    expect(focus.outlineWidth).not.toBe('0px');
    await page.emulateMedia({ forcedColors: 'active' });
    await pre.focus();
    expect(await pre.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await pre.screenshot({ path: 'test-artifacts/screenshots/core-preformatted-scroll-390.png' });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.locator('html').evaluate(root => { root.style.fontSize = ''; });
    await page.setViewportSize({ width: 1440, height: 900 });
    await code.screenshot({ path: 'test-artifacts/screenshots/core-code-focus-1440.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
