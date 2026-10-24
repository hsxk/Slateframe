const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { openAuthenticatedEditor } = require('./support/editor-login');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const label = '日本語 中文 العربية ' + 'LongUnbrokenProjectAction'.repeat(12);
const button = (text, target) => '<!-- wp:button --><div class="wp-block-button">' +
  '<a class="wp-block-button__link wp-element-button" href="' + target + '">' + text +
  '</a></div><!-- /wp:button -->';
const content = '<!-- wp:group {"className":"slateframe-core-buttons-fixture"} -->' +
  '<div class="wp-block-group slateframe-core-buttons-fixture">' +
  '<!-- wp:buttons {"layout":{"type":"flex","flexWrap":"nowrap"}} -->' +
  '<div class="wp-block-buttons is-nowrap">' + button(label, '#buttons-end') +
  button('Next / 次へ / التالي', '#buttons-end') + '</div><!-- /wp:buttons -->' +
  '<!-- wp:buttons {"layout":{"type":"flex","orientation":"vertical"}} -->' +
  '<div class="wp-block-buttons is-vertical">' + button(label, '#buttons-end') +
  '</div><!-- /wp:buttons --><p id="buttons-end">End of actions</p>' +
  '</div><!-- /wp:group -->';

test('Core Buttons respect narrow reflow, 44px targets, RTL and 400% zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture is resized across seven widths.');
  test.setTimeout(120_000);
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Buttons reflow', '--post_content=' + content, '--porcelain');
  try {
    expect(wp('post', 'get', id, '--field=post_content')).toContain('is-nowrap');
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-core-buttons-fixture');
    // WordPress 7.1+ may inline registered block CSS on demand. Verify the
    // actual native-block asset, not one particular transport mechanism.
    const scopedStyle = page.locator('style#slateframe-core-buttons-inline-css, link#slateframe-core-buttons-css');
    await expect(scopedStyle).toHaveCount(1);
    if (await scopedStyle.evaluate(node => node.tagName === 'STYLE')) {
      // Playwright's visible-text matcher excludes <style>; inspect raw CSS.
      const cssText = await scopedStyle.evaluate(node => node.textContent || '');
      expect(cssText).toContain('.wp-block-buttons.is-nowrap>');
      expect(cssText).toContain('@media(forced-colors:active)');
      expect(cssText).toContain('core-buttons.css');
    } else {
      await expect(scopedStyle).toHaveAttribute('href', /core-buttons[.]css/);
    }
    await expect(root.locator('.wp-block-buttons')).toHaveCount(2);
    await expect(root.locator('.wp-block-button__link')).toHaveCount(3);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, value) => { node.dir = value; node.style.fontSize = ''; }, dir);
        const geometry = await root.evaluate(node => {
          const bounds = element => { const r = element.getBoundingClientRect(); return { left:r.left,right:r.right,width:r.width,height:r.height }; };
          return { pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            groups: [...node.querySelectorAll('.wp-block-buttons')].map(bounds),
            nowrap: { wrap: getComputedStyle(node.querySelector('.wp-block-buttons.is-nowrap')).flexWrap,
              shrink: [...node.querySelectorAll('.wp-block-buttons.is-nowrap > .wp-block-button')]
                .map(button => getComputedStyle(button).flexShrink) },
            buttons: [...node.querySelectorAll('.wp-block-button')].map(bounds),
            links: [...node.querySelectorAll('.wp-block-button__link')].map(bounds),
          };
        });
        expect(geometry.pageOverflow, width + ' ' + dir).toBeLessThanOrEqual(1);
        expect(geometry.groups).toHaveLength(2);
        expect(geometry.nowrap.wrap).toBe('nowrap');
        expect(geometry.nowrap.shrink).toEqual(['1', '1']);
        if (width <= 412) {
          const [primary, secondary] = geometry.buttons;
          expect(primary.width, width + ' ' + dir + ' primary readable width').toBeGreaterThanOrEqual(100);
          expect(secondary.width, width + ' ' + dir + ' secondary readable width').toBeGreaterThanOrEqual(100);
          expect(Math.abs(primary.width - secondary.width), width + ' ' + dir + ' balanced actions').toBeLessThanOrEqual(2);
        }
        for (const rect of geometry.groups) {
          expect(rect.left, width + ' ' + dir + ' group left').toBeGreaterThanOrEqual(-1);
          expect(rect.right, width + ' ' + dir + ' group right').toBeLessThanOrEqual(width + 1);
        }
        expect(geometry.links).toHaveLength(3);
        for (const rect of [...geometry.buttons, ...geometry.links]) {
          expect(rect.left, width + ' ' + dir + ' left').toBeGreaterThanOrEqual(-1);
          expect(rect.right, width + ' ' + dir + ' right').toBeLessThanOrEqual(width + 1);
          expect(rect.width).toBeGreaterThanOrEqual(43);
        }
        for (const rect of geometry.links) expect(rect.height).toBeGreaterThanOrEqual(43);
        if ([320, 390, 1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await root.screenshot({ path: 'test-artifacts/screenshots/core-buttons-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
    for (const zoom of ['200%', '400%']) {
      await page.locator('html').evaluate((node, value) => { node.style.fontSize = value; }, zoom);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), zoom).toBeLessThanOrEqual(1);
      for (const link of await root.locator('.wp-block-button__link').all()) {
        const r = await link.boundingBox();
        expect(r.width).toBeGreaterThanOrEqual(43);
        expect(r.height).toBeGreaterThanOrEqual(43);
        expect(r.x).toBeGreaterThanOrEqual(-1);
        expect(r.x + r.width).toBeLessThanOrEqual(321);
        expect(await link.evaluate(node => parseFloat(getComputedStyle(node).paddingInlineStart)))
          .toBeLessThanOrEqual(12.5);
      }
    }
    await page.locator('html').evaluate(node => { node.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const first = root.locator('.wp-block-button__link').first();
    await first.focus();
    await expect(first).toBeFocused();
    expect(await first.evaluate(node => node.matches(':focus-visible'))).toBe(true);
    expect(await first.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    for (const link of await root.locator('.wp-block-button__link').all()) {
      const colors = await link.evaluate(node => { const s = getComputedStyle(node); return { foreground: s.color, background: s.backgroundColor }; });
      expect(colors.foreground).not.toBe(colors.background);
    }
    const a11y = await new AxeBuilder({ page }).include('.slateframe-core-buttons-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-buttons-320-rtl-200-forced-colors.png' });
    // A native Core Button page loads its scoped stylesheet; an unrelated 404 does not.
    await page.goto('/?p=999999', { waitUntil: 'networkidle' });
    await expect(page.locator('style#slateframe-core-buttons-inline-css, link#slateframe-core-buttons-css')).toHaveCount(0);
  } finally {
    wp('post', 'delete', id, '--force');
  }
});

test('Core Buttons Gutenberg attributes round-trip without modifying the editor post', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture.');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks;
    const editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const layouts = [
      { type: 'flex', flexWrap: 'nowrap' },
      { type: 'flex', orientation: 'vertical' },
    ];
    const cases = layouts.map(layout => {
      const created = blocks.createBlock('core/buttons', { layout }, [
        blocks.createBlock('core/button', { text: '日本語 中文 العربية', url: '#buttons-end' }),
      ]);
      const serialized = blocks.serialize(created);
      const parsed = blocks.parse(serialized);
      return { serialized, roundtrip: blocks.serialize(parsed), valid: parsed[0]?.isValid,
        name: parsed[0]?.name, layout: parsed[0]?.attributes.layout,
        innerName: parsed[0]?.innerBlocks[0]?.name };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const item of result.cases) {
    expect(item.name).toBe('core/buttons');
    expect(item.innerName).toBe('core/button');
    expect(item.valid).toBe(true);
    expect(item.roundtrip).toBe(item.serialized);
    expect(item.serialized).toContain('日本語 中文 العربية');
  }
  expect(result.cases[0].layout.flexWrap).toBe('nowrap');
  expect(result.cases[1].layout.orientation).toBe('vertical');
});
