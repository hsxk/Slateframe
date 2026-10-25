const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const longTitle = '日本語 中文 العربية ' + 'UnbrokenAdjacentPostTitle'.repeat(5);
const content = '<!-- wp:group {"className":"slateframe-core-post-navigation-fixture"} -->' +
  '<div class="wp-block-group slateframe-core-post-navigation-fixture">' +
  '<!-- wp:post-navigation-link {"type":"previous","showTitle":true,"linkLabel":true,"label":"Previous / 前へ / السابق","arrow":"arrow"} /-->' +
  '<!-- wp:post-navigation-link {"type":"next","showTitle":true,"linkLabel":false,"label":"Next / 次へ / التالي","arrow":"chevron"} /-->' +
  '</div><!-- /wp:group -->';

test('Core Post Navigation retains native adjacency, 44px targets and multilingual reflow', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture resized across seven widths');
  test.setTimeout(120000);
  const ids = [];
  try {
    ids.push(wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_date=2001-01-01 12:00:00', '--post_title=' + longTitle, '--porcelain'));
    ids.push(wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_date=2001-01-02 12:00:00', '--post_title=Core adjacent article',
      '--post_content=' + content, '--porcelain'));
    ids.push(wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_date=2001-01-03 12:00:00', '--post_title=' + longTitle, '--porcelain'));
    await page.goto('/?p=' + ids[1], { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-core-post-navigation-fixture');
    await expect(root).toBeVisible();
    const links = root.locator('.wp-block-post-navigation-link a');
    await expect(links).toHaveCount(2);
    // Pretty permalinks may hide ?p=, so resolve the native hrefs against WP CLI.
    const urls = [ids[0], ids[2]].map(id => wp('post', 'url', id));
    const actual = await links.evaluateAll(nodes => nodes.map(node => node.href.replace(/[/]$/, '')));
    expect(actual.sort()).toEqual(urls.map(url => url.replace(/[/]$/, '')).sort());
    await expect.poll(() => links.first().evaluate(node => getComputedStyle(node).minBlockSize)).toBe('44px');
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir;
            node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            links: [...node.querySelectorAll('.wp-block-post-navigation-link a')].map(link => {
              const r = link.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(link).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' root overflow').toBeLessThanOrEqual(1);
          expect(state.links).toHaveLength(2);
          for (const rect of state.links) {
            expect(rect.width, label + ' touch width').toBeGreaterThanOrEqual(43);
            expect(rect.height, label + ' touch height').toBeGreaterThanOrEqual(43);
            expect(rect.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(rect.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(rect.wrap).toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await fs.mkdir('test-artifacts/screenshots', { recursive: true });
            await root.screenshot({ path: 'test-artifacts/screenshots/core-post-navigation-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    const outline = await links.first().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth));
    expect(outline).toBeGreaterThanOrEqual(3);
    const axe = await new AxeBuilder({ page }).include('.slateframe-core-post-navigation-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    await links.first().focus();
    expect(await links.first().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-post-navigation-390-rtl-forced-colors.png' });
    const link = links.first();
    await link.click();
    await expect(page).toHaveURL(url => url.href.replace(/[/]$/, '') === urls[0].replace(/[/]$/, '') ||
      url.href.replace(/[/]$/, '') === urls[1].replace(/[/]$/, ''));
  } finally {
    for (const id of ids.reverse()) wp('post', 'delete', id, '--force');
  }
});
