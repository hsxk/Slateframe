const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('Core Post Date preserves native time, permalink and responsive target', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable post covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-post-date-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:group {"className":"slateframe-post-date-fixture"} -->' +
    '<div class="wp-block-group slateframe-post-date-fixture">' +
    '<!-- wp:post-date {"isLink":true} /--><!-- wp:post-date {"isLink":false} /-->' +
    '</div><!-- /wp:group -->';
  const id = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=' + slug, '--post_content=' + content, '--porcelain');
  try {
    const permalink = wp('eval', 'echo get_permalink(' + Number(id) + ');');
    await page.goto('/?p=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-post-date-fixture');
    await expect(root).toBeVisible();
    const dates = root.locator('.wp-block-post-date');
    await expect(dates).toHaveCount(2);
    await expect(dates.locator('time')).toHaveCount(2);
    const link = dates.first().locator('a');
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toBe(permalink);
    await expect(dates.last().locator('a')).toHaveCount(0);
    for (const attr of await dates.locator('time').evaluateAll(nodes => nodes.map(n => n.getAttribute('datetime')))) {
      expect(attr).toMatch(/^\d{4}-\d\d-\d\d/);
    }
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-post-date-inline-css') ||
      document.getElementById('slateframe-core-post-date-css')
    ))).toBe(true);
    const nativeDatetime = await link.locator('time').getAttribute('datetime');
    await link.locator('time').evaluate(el => {
      el.textContent = '日本語 中文 العربية ' + 'LongLocalizedDate'.repeat(7);
    });
    await expect(link.locator('time[datetime]')).toHaveCount(1);
    expect(await link.locator('time').getAttribute('datetime')).toBe(nativeDatetime);
    expect(await link.locator('time').evaluate(el => getComputedStyle(el).fontVariantNumeric))
      .toContain('tabular-nums');
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, v) => {
            node.dir = v.dir; node.style.fontSize = v.font + 'px';
          }, { dir, font });
          const metrics = await link.evaluate(el => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, height: r.height,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              wrap: getComputedStyle(el).overflowWrap };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(metrics.overflow, label + ' root overflow').toBeLessThanOrEqual(1);
          expect(metrics.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(metrics.right, label + ' right').toBeLessThanOrEqual(width + 1);
          expect(metrics.width, label + ' target width').toBeGreaterThanOrEqual(43);
          expect(metrics.height, label + ' target height').toBeGreaterThanOrEqual(43);
          expect(metrics.wrap, label + ' CJK wrap').toBe('anywhere');
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await root.screenshot({ path: 'test-artifacts/screenshots/core-post-date-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(el => { el.dir = 'rtl'; el.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-post-date-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-post-date-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(el => { el.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await link.click();
    await expect.poll(() => page.url()).toBe(permalink);
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-post-date-inline-css') ||
      document.getElementById('slateframe-core-post-date-css'))).toBeNull();
  } finally { wp('post', 'delete', id, '--force'); }
});

test('Core Post Date Gutenberg roundtrip keeps native date options', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width),
    'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/post-date')?.attributes;
    if (!schema) throw new Error('Native Core Post Date schema missing');
    const cases = [true, false].map(isLink => {
      const attrs = { isLink };
      const first = blocks.serialize(blocks.createBlock('core/post-date', attrs));
      const parsed = blocks.parse(first);
      const second = blocks.serialize(parsed);
      const reparsed = blocks.parse(second);
      return { first, second, third: blocks.serialize(reparsed), count: parsed.length,
        name: parsed[0]?.name, valid: parsed[0]?.isValid, attrs: parsed[0]?.attributes,
        reparsedAttrs: reparsed[0]?.attributes, isLink };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases,
      supportsLink: Object.prototype.hasOwnProperty.call(schema, 'isLink') };
  });
  expect(result.after).toBe(result.before);
  // Core may inject a transient datetime binding on initial serialization and
  // normalize it away on parse. Compare all authored attributes while removing
  // only that documented Core-generated date binding, never other metadata.
  const withoutTransientDateBinding = markup => markup.replace(
    /<!-- wp:post-date (\{.*?\}) \/-->/g,
    (whole, json) => {
      const attrs = JSON.parse(json);
      const binding = attrs.metadata?.bindings?.datetime;
      if (binding?.source !== 'core/post-data' || binding.args?.field !== 'date') {
        return whole;
      }
      delete attrs.metadata.bindings.datetime;
      if (!Object.keys(attrs.metadata.bindings).length) delete attrs.metadata.bindings;
      if (!Object.keys(attrs.metadata).length) delete attrs.metadata;
      return '<!-- wp:post-date ' + JSON.stringify(attrs) + ' /-->';
    }
  );
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/post-date');
    expect(entry.valid).toBe(true);
    expect(entry.first).toContain('<!-- wp:post-date');
    expect(withoutTransientDateBinding(entry.first)).toBe(
      withoutTransientDateBinding(entry.second)
    );
    expect(entry.second).toBe(entry.third);
    expect(entry.attrs).toEqual(entry.reparsedAttrs);
    if (result.supportsLink) expect(entry.attrs.isLink).toBe(entry.isLink);
  }
});
