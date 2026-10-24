const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('only markerless Slateframe Core lists receive fallback list semantics', async ({}, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress filter fixture');
  const evidence = JSON.parse(wp('eval', `
    $cases = array(
      'steps' => '<ol class="wp-block-list is-style-slateframe-steps"><li>First</li></ol>',
      'checklist' => '<ul class="wp-block-list is-style-slateframe-checklist"><li>Check</li></ul>',
      'author' => '<ul role="group" class="is-style-slateframe-checklist"><li>Authored</li></ul>',
      'plain' => '<ol class="wp-block-list"><li>Ordinary</li></ol>',
      'nested' => '<ul class="wp-block-list"><li><ul class="is-style-slateframe-steps"><li>Child</li></ul></li></ul>',
      'lookalike' => '<div class="is-style-slateframe-steps"><ul><li>Not a root list</li></ul></div>',
      'substring' => '<ol class="is-style-slateframe-steps-other"><li>Different style</li></ol>',
    );
    $results = array();
    foreach ( $cases as $key => $source ) {
      $rendered = apply_filters( 'render_block_core/list', $source );
      $processor = new WP_HTML_Tag_Processor( $rendered );
      $processor->next_tag();
      $results[ $key ] = array(
        'role' => $processor->get_attribute( 'role' ),
        'unchanged' => $rendered === $source,
        'text' => wp_strip_all_tags( $rendered ),
      );
    }
    echo wp_json_encode( $results );
  `));
  expect(evidence.steps.role).toBe('list');
  expect(evidence.checklist.role).toBe('list');
  expect(evidence.steps.unchanged).toBe(false);
  expect(evidence.checklist.unchanged).toBe(false);
  expect(evidence.author).toMatchObject({ role: 'group', unchanged: true });
  for (const key of ['plain', 'nested', 'lookalike', 'substring']) {
    expect(evidence[key].role, key).toBeNull();
    expect(evidence[key].unchanged, key).toBe(true);
  }
  for (const key of Object.keys(evidence)) expect(evidence[key].text.length).toBeGreaterThan(0);
});

test('real Core list semantics survive RTL/CJK, nested markers, zoom and forced colors', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers all widths');
  test.setTimeout(120_000);
  const content = '<!-- wp:list {"ordered":true,"className":"is-style-slateframe-steps"} -->' +
    '<ol class="wp-block-list is-style-slateframe-steps"><li>日本語 中文 العربية ' +
    '<a href="#end">Review evidence</a><ul><li>Native nested marker</li></ul></li>' +
    '<li>Verify the result</li></ol><!-- /wp:list -->' +
    '<!-- wp:list {"className":"is-style-slateframe-checklist"} -->' +
    '<ul class="wp-block-list is-style-slateframe-checklist"><li>Check العربية 中文 ' +
    '<ol><li>Native nested numbering</li></ol></li></ul><!-- /wp:list -->' +
    '<p id="end">Complete</p>';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe list semantics regression', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const steps = page.locator('.slateframe-prose ol.is-style-slateframe-steps').first();
    const checklist = page.locator('.slateframe-prose ul.is-style-slateframe-checklist').first();
    await expect(steps).toHaveAttribute('role', 'list');
    await expect(checklist).toHaveAttribute('role', 'list');
    await expect(steps.locator(':scope > li')).toHaveCount(2);
    await expect(checklist.locator(':scope > li')).toHaveCount(1);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((root, dir) => { root.dir = dir; }, direction);
        const geometry = await steps.evaluate(node => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          listStyle: getComputedStyle(node).listStyleType,
          nestedStyle: getComputedStyle(node.querySelector('ul')).listStyleType,
          badge: getComputedStyle(node.querySelector('li'), '::before').content,
          direction: getComputedStyle(node.querySelector('li'), '::before').direction,
        }));
        expect(geometry.overflow, width + ' ' + direction).toBeLessThanOrEqual(1);
        expect(geometry.listStyle).toBe('none');
        expect(geometry.nestedStyle).not.toBe('none');
        expect(geometry.badge).not.toBe('none');
        expect(geometry.direction).toBe(direction);
        expect(await checklist.locator('ol').evaluate(node => getComputedStyle(node).listStyleType)).not.toBe('none');
      }
    }
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'ltr'; });
    await steps.screenshot({ path: 'test-artifacts/screenshots/core-list-semantics-1440-ltr.png' });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const link = steps.locator('a[href]').first();
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(node => node.matches(':focus-visible'))).toBe(true);
    expect(await link.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
    expect(await steps.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const axe = await new AxeBuilder({ page }).include('.slateframe-prose')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map(({ id, nodes }) => ({
      id, targets: nodes.map(({ target }) => target),
    }))).toEqual([]);
    await steps.screenshot({
      path: 'test-artifacts/screenshots/core-list-semantics-390-rtl-200-forced-colors.png',
    });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
