const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const src = '/wp-content/themes/slateframe/assets/images/pattern-placeholder-landscape.svg';
const words = '日本語 中文 العربية ' + 'LongUnbrokenKnowledgeReference'.repeat(8);
const image = '<figure class="wp-block-media-text__media"><img src="' + src + '" alt="Landscape composition"></figure>';
const body = '<div class="wp-block-media-text__content"><!-- wp:paragraph --><p><a href="#media-text-end">' + words + '</a></p><!-- /wp:paragraph --></div>';
const fixture = '<!-- wp:group {"className":"slateframe-media-text-fixture"} --><div class="wp-block-group slateframe-media-text-fixture">' +
  '<!-- wp:media-text {"mediaType":"image","mediaUrl":"' + src + '","isStackedOnMobile":true} -->' +
  '<div class="wp-block-media-text is-stacked-on-mobile">' + image + body + '</div><!-- /wp:media-text -->' +
  '<!-- wp:media-text {"mediaPosition":"right","mediaType":"image","mediaUrl":"' + src + '","isStackedOnMobile":false} -->' +
  '<div class="wp-block-media-text has-media-on-the-right">' + image + body + '</div><!-- /wp:media-text -->' +
  '<p id="media-text-end">End of reference.</p></div><!-- /wp:group -->';

test('Core Media & Text stays bounded in seven widths, RTL, 200% text and forced colors', async ({ page }) => {
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe Media Text ' + randomUUID(), '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-media-text-fixture');
    await expect(root).toBeVisible();
    await expect(root.locator('.wp-block-media-text')).toHaveCount(2);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, value) => { node.dir = value; node.style.fontSize = ''; }, dir);
        const data = await root.evaluate(node => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          blocks: [...node.querySelectorAll('.wp-block-media-text')].map(block => {
            const r = el => { const x = el.getBoundingClientRect(); return { left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width }; };
            const media = block.querySelector('.wp-block-media-text__media');
            const content = block.querySelector('.wp-block-media-text__content');
            return { box:r(block),media:r(media),content:r(content),image:r(media.querySelector('img')),
              min:getComputedStyle(content).minInlineSize,wrap:getComputedStyle(content).overflowWrap };
          }),
        }));
        expect(data.overflow, width + ' ' + dir + ' page overflow').toBeLessThanOrEqual(1);
        for (const block of data.blocks) {
          expect(block.min).toBe('0px');
          expect(block.wrap).toBe('anywhere');
          for (const child of [block.media, block.content, block.image]) {
            expect(child.width).toBeGreaterThan(0);
            expect(child.left, width + ' ' + dir + ' left').toBeGreaterThanOrEqual(block.box.left - 1);
            expect(child.right, width + ' ' + dir + ' right').toBeLessThanOrEqual(block.box.right + 1);
          }
        }
        if (width <= 600) {
          expect(data.blocks[0].content.top, 'Core mobile stack').toBeGreaterThanOrEqual(data.blocks[0].media.bottom - 1);
          expect(Math.abs(data.blocks[1].content.top - data.blocks[1].media.top), 'Core unstacked mobile').toBeLessThanOrEqual(2);
        }
        if ([390, 1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await root.screenshot({ path: 'test-artifacts/screenshots/core-media-text-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const link = root.locator('a').first();
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    await expect.poll(() => link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    const a11y = await new AxeBuilder({ page }).include('.slateframe-media-text-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-media-text-390-rtl-200-forced-colors.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Core Media & Text Gutenberg attributes serialize and parse without mutating editor', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const editor = window.wp.data.select('core/block-editor');
    const blocks = window.wp.blocks;
    const before = blocks.serialize(editor.getBlocks());
    if (!blocks.getBlockType('core/media-text')) throw new Error('Core Media & Text not registered');
    const cases = [true, false].map(isStackedOnMobile => {
      const created = blocks.createBlock('core/media-text', {
        mediaType: 'image', mediaUrl: '/wp-content/themes/slateframe/assets/images/pattern-placeholder-landscape.svg',
        mediaAlt: '日本語 中文 العربية', mediaPosition: 'right', isStackedOnMobile,
      }, [blocks.createBlock('core/paragraph', { content: '日本語 中文 العربية' })]);
      const first = blocks.serialize(created);
      const parsed = blocks.parse(first);
      return { first, second: blocks.serialize(parsed), valid: parsed[0]?.isValid,
        name: parsed[0]?.name, count: parsed.length, attrs: parsed[0]?.attributes };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.name).toBe('core/media-text');
    expect(entry.count).toBe(1);
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.first);
    expect(entry.attrs.mediaPosition).toBe('right');
    expect(entry.first).toContain('日本語 中文 العربية');
  }
  expect(result.cases[0].attrs.isStackedOnMobile).toBe(true);
  expect(result.cases[1].attrs.isStackedOnMobile).toBe(false);
});
