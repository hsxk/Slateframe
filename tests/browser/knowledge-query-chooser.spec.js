const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000
}).trim();

test('native Knowledge Query chooser renders articles with responsive RTL/CJK and accessible links', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One fixture exercises the full responsive matrix');
  test.setTimeout(180000);
  const registered = JSON.parse(wp('eval',
    "echo wp_json_encode( WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-query-loop') );"));
  expect(registered).toBeTruthy();
  expect(registered.blockTypes).toContain('core/query');
  expect(registered.content.trim()).toMatch(/^<!-- wp:query /);
  const marker = 'slateframe-knowledge-proof-' + randomUUID().replaceAll('-', '').slice(0, 12);
  const postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=' + marker + ' 日本語中文 العربية VeryLongUnbrokenKnowledgeIdentifier',
    '--post_content=Portable article reading fixture', '--porcelain');
  let pageId;
  try {
    const needle = '"search":""';
    expect(registered.content.split(needle)).toHaveLength(2);
    const blocks = registered.content.replace(needle, '"search":"' + marker + '"');
    pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--post_title=Knowledge Query chooser fixture', '--post_content=' + blocks, '--porcelain');
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const query = page.locator('.wp-block-query.slateframe-knowledge-query').first();
    const cards = query.locator('.wp-block-post-template > .wp-block-post');
    await expect(query).toBeVisible();
    await expect(cards).toHaveCount(1);
    await expect(query.locator('.wp-block-query-no-results')).toHaveCount(0);
    const link = cards.first().locator('.wp-block-post-title a');
    await expect(link).toContainText(marker);
    await link.focus();
    await expect(link).toBeFocused();
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await page.locator('html').evaluate((node, state) => {
            node.dir = state.dir;
            node.style.fontSize = state.font + 'px';
          }, { dir, font });
          const result = await query.evaluate(node => {
            const root = document.documentElement;
            const rect = node.getBoundingClientRect();
            const anchor = node.querySelector('.wp-block-post-title a');
            const range = document.createRange();
            range.selectNodeContents(anchor);
            const clipped = [...range.getClientRects()].some(r =>
              r.width > 0 && (r.left < -1 || r.right > root.clientWidth + 1));
            return { overflow: root.scrollWidth - root.clientWidth,
              left: rect.left, right: rect.right, viewport: root.clientWidth, clipped };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(result.overflow, label).toBeLessThanOrEqual(1);
          expect(result.left, label).toBeGreaterThanOrEqual(-1);
          expect(result.right, label).toBeLessThanOrEqual(result.viewport + 1);
          expect(result.clipped, label).toBe(false);
        }
      }
    }
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '64px'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page }).include('.slateframe-knowledge-query')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await link.focus();
    await expect(link).toBeFocused();
    await query.locator('.wp-block-post-title').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-artifacts/screenshots/knowledge-query-chooser-390-rtl-400.png',
      animations: 'disabled'
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'ltr'; node.style.fontSize = '16px'; });
    await page.emulateMedia({ forcedColors: 'none' });
    await query.locator('.wp-block-post-title').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-artifacts/screenshots/knowledge-query-chooser-1440-ltr.png',
      animations: 'disabled'
    });
  } finally {
    if (pageId) wp('post', 'delete', pageId, '--force');
    wp('post', 'delete', postId, '--force');
  }
});

test('native Knowledge Query chooser preserves the empty state without fake posts', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Single empty-state fixture');
  const registered = wp('eval',
    "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-query-loop')['content'];");
  const needle = '"search":""';
  expect(registered.split(needle)).toHaveLength(2);
  const content = registered.replace(needle,
    '"search":"slateframe-no-match-' + randomUUID().replaceAll('-', '') + '"');
  const pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Knowledge empty Query fixture', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const query = page.locator('.slateframe-knowledge-query');
    await expect(query).toBeVisible();
    await expect(query.locator('.wp-block-post-template > .wp-block-post')).toHaveCount(0);
    await expect(query.locator('.wp-block-query-no-results')).toContainText('No articles are available yet.');
    await expect(query.locator('.wp-block-query-pagination a')).toHaveCount(0);
  } finally {
    wp('post', 'delete', pageId, '--force');
  }
});

test('native Knowledge Query chooser remains valid and editable in Gutenberg', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Authenticated editor fixture');
  test.setTimeout(120000);
  const { openAuthenticatedEditor } = require('./support/editor-login');
  const registered = wp('eval',
    "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-query-loop')['content'];");
  const pageId = wp('post', 'create', '--post_type=page', '--post_status=draft',
    '--post_title=Knowledge Query editor fixture', '--post_content=' + registered, '--porcelain');
  try {
    await openAuthenticatedEditor(page, pageId);
    const blocks = await page.evaluate(() => {
      const roots = window.wp.data.select('core/block-editor').getBlocks();
      const names = [], invalid = [];
      const walk = entries => entries.forEach(block => {
        names.push(block.name);
        if (block.isValid === false) invalid.push(block.name);
        walk(block.innerBlocks || []);
      });
      walk(roots);
      return { root: roots[0]?.name, names, invalid };
    });
    expect(blocks.root).toBe('core/query');
    expect(blocks.invalid).toEqual([]);
    expect(blocks.names).not.toContain('core/missing');
    for (const name of ['core/post-template', 'core/post-title', 'core/post-date',
      'core/post-excerpt', 'core/query-pagination', 'core/query-no-results']) {
      expect(blocks.names).toContain(name);
    }
  } finally {
    wp('post', 'delete', pageId, '--force');
  }
});
