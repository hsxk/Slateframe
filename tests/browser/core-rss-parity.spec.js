const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

// Core renders both variants against a deterministic synthetic feed; no external network.
test('Core RSS list/grid titles remain operable across direction, zoom and forced colors', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress page covers all seven widths');
  test.setTimeout(120000);
  const native = JSON.parse(wp('eval-file', process.cwd() + '/tests/fixtures/core-rss-native.php.fixture'));
  // A URL-less native block requests its conditional stylesheet without rendering a self-feed warning.
  const content = '<!-- wp:rss /-->' +
    '<div class="wp-block-group slateframe-rss-fixture">' + native.list + native.grid + '</div>';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Native Core RSS layout fixture', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-rss-fixture');
    await expect(root).toBeVisible();
    // Visual evidence must not include Core's homepage/self-feed error banner.
    await expect(page.locator('.slateframe-prose .components-placeholder .notice-error')).toHaveCount(0);
    const lists = root.locator('ul.wp-block-rss');
    await expect(lists).toHaveCount(2);
    await expect(lists.last()).toHaveClass(/is-grid/);
    const links = root.locator('a[href^="https://example.org/entry/"]');
    await expect(links).toHaveCount(6);
    expect(await links.evaluateAll(nodes => nodes.map(node => node.href))).toEqual(
      [0, 1, 2, 0, 1, 2].map(i => 'https://example.org/entry/' + i));
    await expect(root.locator('.wp-block-rss__item-publish-date')).toHaveCount(6);
    await expect(root.locator('.wp-block-rss__item-author')).toHaveCount(6);
    await expect(root.locator('.wp-block-rss__item-excerpt')).toHaveCount(6);
    await expect.poll(() => page.evaluate(() => {
      const inline = document.getElementById('slateframe-core-rss-inline-css');
      const external = document.getElementById('slateframe-core-rss-css');
      return Boolean((inline && inline.textContent.includes('.wp-block-rss')) ||
        (external && external.sheet));
    })).toBe(true);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, value) => {
          node.dir = value;
          node.style.fontSize = '16px';
        }, dir);
        const state = await root.evaluate(node => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          nodes: [...node.querySelectorAll('li,a[href^="https://example.org/entry/"],.wp-block-rss__item-excerpt')]
            .map(el => {
              const r = el.getBoundingClientRect();
              const p = el.parentElement.getBoundingClientRect();
              return { left: r.left, right: r.right, parentLeft: p.left, parentRight: p.right,
                height: r.height, width: r.width, link: el.tagName === 'A', wrap: getComputedStyle(el).overflowWrap };
            }),
        }));
        const label = width + 'px ' + dir;
        expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
        for (const n of state.nodes) {
          expect(n.left, label + ' left').toBeGreaterThanOrEqual(n.parentLeft - 1);
          expect(n.right, label + ' right').toBeLessThanOrEqual(n.parentRight + 1);
          if (n.link) {
            expect(n.height, label + ' target height').toBeGreaterThanOrEqual(43);
            expect(n.width, label + ' target width').toBeGreaterThanOrEqual(43);
            expect(n.wrap).toBe('anywhere');
          }
        }
        if ([320, 390, 1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await page.screenshot({ fullPage: true, path: 'test-artifacts/screenshots/core-rss-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.keyboard.press('Tab');
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(await links.first().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    const axe = await new AxeBuilder({ page }).include('.slateframe-rss-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.screenshot({ fullPage: true, path: 'test-artifacts/screenshots/core-rss-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-rss-inline-css') ||
      document.getElementById('slateframe-core-rss-css'))).toBeNull();
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Core RSS Gutenberg attributes round-trip without changing saved content', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const attrs = { feedURL: 'https://example.org/feed.xml', itemsToShow: 4,
      displayExcerpt: true, displayAuthor: true, displayDate: true,
      blockLayout: 'grid', columns: 2, excerptLength: 20 };
    const block = blocks.createBlock('core/rss', attrs);
    const serialized = blocks.serialize([block]);
    const parsed = blocks.parse(serialized);
    return { registered: Boolean(blocks.getBlockType('core/rss')),
      serialized, count: parsed.length, attributes: parsed[0]?.attributes };
  });
  expect(result.registered).toBe(true);
  expect(result.count).toBe(1);
  for (const [key, value] of Object.entries({ feedURL: 'https://example.org/feed.xml',
    itemsToShow: 4, displayExcerpt: true, displayAuthor: true, displayDate: true,
    blockLayout: 'grid', columns: 2, excerptLength: 20 })) {
    expect(result.attributes[key], key).toEqual(value);
  }
});
