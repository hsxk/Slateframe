const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const { setRootTextScale } = require('./support/root-text-scale');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const fixture = [
  '<!-- wp:group {"className":"slateframe-social-fixture"} -->',
  '<div class="wp-block-group slateframe-social-fixture">',
  '<!-- wp:social-links {"className":"is-style-logos-only"} -->',
  '<ul class="wp-block-social-links is-style-logos-only">',
  '<!-- wp:social-link {"url":"#social-end","service":"wordpress"} /-->',
  '<!-- wp:social-link {"url":"#social-end","service":"github"} /-->',
  '<!-- wp:social-link {"url":"#social-end","service":"mastodon"} /-->',
  '</ul><!-- /wp:social-links -->',
  '<!-- wp:paragraph --><p id="social-end">Social navigation end.</p><!-- /wp:paragraph -->',
  '</div><!-- /wp:group -->'
].join('');

test('native Social Links preserve 44px focus and touch targets at seven widths', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Social links ' + randomUUID(), '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-social-fixture');
    const list = root.locator('.wp-block-social-links');
    const links = list.locator('.wp-block-social-link-anchor');
    await expect(links).toHaveCount(3);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const geometry = await list.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            wrap: getComputedStyle(node).flexWrap,
            links: [...node.querySelectorAll('.wp-block-social-link-anchor')].map(link => {
              const r = link.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height };
            })
          }));
          const label = width + ' ' + dir + ' ' + font;
          expect(geometry.overflow, label).toBeLessThanOrEqual(1);
          expect(geometry.wrap).toBe('wrap');
          for (const link of geometry.links) {
            expect(link.width, label + ' touch width').toBeGreaterThanOrEqual(44);
            expect(link.height, label + ' touch height').toBeGreaterThanOrEqual(44);
            expect(link.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(link.right, label + ' right').toBeLessThanOrEqual(width + 1);
          }
        }
        if ([390, 1440].includes(width)) {
          await setRootTextScale(page, 32, dir);
          await list.screenshot({ path: 'test-artifacts/screenshots/core-social-links-' + width + '-' + dir + '-200.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    const outline = await links.first().evaluate(node => getComputedStyle(node).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-social-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await list.screenshot({ path: 'test-artifacts/screenshots/core-social-links-390-rtl-400-forced-colors.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Gutenberg Social Links keep Core service labels and serialized structure', async ({ page }, info) => {
  const id = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!id || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated editor fixture');
  await openAuthenticatedEditor(page, id);
  const result = await page.evaluate(() => {
    const editor = window.wp.data.select('core/block-editor');
    const blocks = window.wp.blocks;
    const before = blocks.serialize(editor.getBlocks());
    const created = blocks.createBlock('core/social-links', {}, [
      blocks.createBlock('core/social-link', { service: 'wordpress', url: '#social-end' }),
      blocks.createBlock('core/social-link', { service: 'github', url: '#social-end' })
    ]);
    const first = blocks.serialize(created);
    const parsed = blocks.parse(first);
    return { before, after: blocks.serialize(editor.getBlocks()), first,
      second: blocks.serialize(parsed), name: parsed[0]?.name, valid: parsed[0]?.isValid,
      children: parsed[0]?.innerBlocks.map(block => block.attributes.service) };
  });
  expect(result.after).toBe(result.before);
  expect(result.name).toBe('core/social-links');
  expect(result.valid).toBe(true);
  expect(result.second).toBe(result.first);
  expect(result.children).toEqual(['wordpress', 'github']);
});
