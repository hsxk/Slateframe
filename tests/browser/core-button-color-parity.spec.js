const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const longLabel = '日本語 中文 العربية ' + 'VeryLongUnbrokenButtonLabel'.repeat(5);
const fixture = `<!-- wp:group {"anchor":"slateframe-core-buttons-fixture"} -->
<div id="slateframe-core-buttons-fixture" class="wp-block-group">
<!-- wp:buttons -->
<div class="wp-block-buttons">
<!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#sf-default">${longLabel}</a></div><!-- /wp:button -->
<!-- wp:button {"className":"is-style-outline"} --><div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="#sf-outline">Outline / 日本語</a></div><!-- /wp:button -->
<!-- wp:button {"backgroundColor":"accent","textColor":"paper"} --><div class="wp-block-button"><a class="wp-block-button__link has-paper-color has-text-color has-accent-background-color has-background wp-element-button" href="#sf-preset">Preset colors / 中文</a></div><!-- /wp:button -->
<!-- wp:button {"style":{"color":{"background":"#345678","text":"#faf5f0"}}} --><div class="wp-block-button"><a class="wp-block-button__link has-text-color has-background wp-element-button" style="color:#faf5f0;background-color:#345678" href="#sf-custom">Custom colors / العربية</a></div><!-- /wp:button -->
<!-- wp:button {"className":"is-style-outline","textColor":"accent"} --><div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-accent-color has-text-color wp-element-button" href="#sf-outline-preset">Outlined accent</a></div><!-- /wp:button -->
</div><!-- /wp:buttons -->
</div><!-- /wp:group -->`;

const color = (locator) => locator.evaluate((node) => {
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  const parent = node.closest('.wp-block-button').getBoundingClientRect();
  return { background: style.backgroundColor, text: style.color, border: style.borderTopStyle,
    borderWidth: parseFloat(style.borderTopWidth), minHeight: parseFloat(style.minBlockSize),
    height: rect.height, left: rect.left, right: rect.right, parentWidth: parent.width,
    width: rect.width, outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth) };
});

test('real Core Button colors, outline and long labels survive responsive RTL and forced colors', async ({ page }, info) => {
  const width = info.project.use.viewport.width;
  const pageId = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe Core Buttons ' + randomUUID(), '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?page_id=' + pageId, { waitUntil: 'networkidle' });
    const root = page.locator('#slateframe-core-buttons-fixture');
    await expect(root).toBeVisible();
    const buttons = root.locator('.wp-block-button__link');
    await expect(buttons).toHaveCount(5);
    const [plain, outline, preset, custom, outlinedPreset] = await Promise.all(
      [0, 1, 2, 3, 4].map((index) => color(buttons.nth(index))));
    expect(plain.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(outline.background).toBe('rgba(0, 0, 0, 0)');
    expect(outline.text).not.toBe(plain.text);
    expect(outline.borderWidth).toBeGreaterThanOrEqual(2);
    expect(preset.background).not.toBe(plain.background);
    expect(preset.text).toBe(plain.text); // Paper preset intentionally equals the filled button's paper foreground.
    expect(custom.background).toBe('rgb(52, 86, 120)');
    expect(custom.text).toBe('rgb(250, 245, 240)');
    expect(outlinedPreset.background).toBe('rgba(0, 0, 0, 0)');
    expect(outlinedPreset.text).not.toBe(outline.text);
    for (const direction of ['ltr', 'rtl']) {
      await page.locator('html').evaluate((node, dir) => {
        node.dir = dir;
        node.style.fontSize = '200%';
      }, direction);
      for (const link of await buttons.all()) {
        const metrics = await color(link);
        expect(metrics.minHeight).toBeGreaterThanOrEqual(44);
        expect(metrics.height).toBeGreaterThanOrEqual(44);
        expect(metrics.width).toBeLessThanOrEqual(metrics.parentWidth + 1);
        expect(metrics.left).toBeGreaterThanOrEqual(-1);
        expect(metrics.right).toBeLessThanOrEqual(width + 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      const a11y = await new AxeBuilder({ page }).include('#slateframe-core-buttons-fixture')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(a11y.violations).toEqual([]);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await page.keyboard.press('Tab');
      await buttons.nth(1).focus();
      await expect(buttons.nth(1)).toBeFocused();
      const focused = await color(buttons.nth(1));
      expect(focused.outline).not.toBe('none');
      expect(focused.outlineWidth).toBeGreaterThanOrEqual(2);
      expect((await color(buttons.nth(1))).borderWidth).toBeGreaterThanOrEqual(2);
      if ([390, 1440].includes(width)) {
        const dir = path.resolve('test-artifacts/screenshots');
        await fs.mkdir(dir, { recursive: true });
        await root.screenshot({ path: path.join(dir, `core-buttons-${direction}-forced-colors-${width}.png`) });
      }
      await page.emulateMedia({ forcedColors: 'none' });
    }
  } finally {
    wp('post', 'delete', pageId, '--force');
  }
});

test('Gutenberg Core Button color and outline attributes round-trip without mutating the post', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const editor = window.wp.data.select('core/block-editor');
    const blocks = window.wp.blocks;
    const before = blocks.serialize(editor.getBlocks());
    const samples = [
      { text: '日本語 中文 العربية', url: '#outline', className: 'is-style-outline' },
      { text: 'Preset', url: '#preset', backgroundColor: 'accent', textColor: 'paper' },
      { text: 'Custom', url: '#custom', style: { color: { background: '#345678', text: '#faf5f0' } } },
    ];
    const outputs = samples.map((attributes) => {
      const first = blocks.serialize(blocks.createBlock('core/button', attributes));
      const parsed = blocks.parse(first);
      return { first, second: blocks.serialize(parsed), valid: parsed[0]?.isValid,
        attributes: parsed[0]?.attributes, count: parsed.length };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), outputs };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.outputs) {
    expect(entry.count).toBe(1);
    expect(entry.valid).toBe(true);
    expect(entry.second).toBe(entry.first);
  }
  expect(result.outputs[0].first).toContain('is-style-outline');
  expect(result.outputs[1].first).toContain('has-accent-background-color');
  expect(result.outputs[1].first).toContain('has-paper-color');
  expect(result.outputs[2].first).toContain('#345678');
});
