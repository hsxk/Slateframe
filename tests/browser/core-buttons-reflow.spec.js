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
  '</div><!-- /wp:group -->' +
  '<!-- wp:html --><div class="slateframe-unrelated-nowrap is-nowrap" style="display:flex">' +
  '<div class="wp-block-button">Unrelated first</div>' +
  '<div class="wp-block-button">Unrelated second</div>' +
  '</div><!-- /wp:html -->';

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
      expect(cssText).toContain('.wp-block-buttons.is-nowrap:not(:has(.has-custom-width)){');
      expect(cssText).toContain('flex-flow:column;align-items:stretch;& a{width:100%}');
      expect(cssText).toContain('@media(width<481px)');
      expect(cssText).toContain('min-inline-size:min(8rem,35%)');
      expect(cssText).not.toMatch(/(^|[{}])\.is-nowrap(?=[:{])/);
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
          const bounds = element => { const r = element.getBoundingClientRect(); return { left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height }; };
          return { pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            groups: [...node.querySelectorAll('.wp-block-buttons')].map(bounds),
            nowrap: { wrap: getComputedStyle(node.querySelector('.wp-block-buttons.is-nowrap')).flexWrap,
              direction: getComputedStyle(node.querySelector('.wp-block-buttons.is-nowrap')).flexDirection,
              shrink: [...node.querySelectorAll('.wp-block-buttons.is-nowrap > .wp-block-button')]
                .map(button => getComputedStyle(button).flexShrink) },
            vertical: getComputedStyle(node.querySelector('.wp-block-buttons.is-vertical')).flexDirection,
            buttons: [...node.querySelectorAll('.wp-block-button')].map(bounds),
            links: [...node.querySelectorAll('.wp-block-button__link')].map(bounds),
          };
        });
        expect(geometry.pageOverflow, width + ' ' + dir).toBeLessThanOrEqual(1);
        expect(geometry.groups).toHaveLength(2);
        // Other Core/plugin containers may also use is-nowrap. The optional
        // native Button stylesheet must never alter their layout or children.
        const unrelated = await page.locator('.slateframe-unrelated-nowrap').evaluate(node => ({
          direction: getComputedStyle(node).flexDirection,
          minimums: [...node.children].map(child => getComputedStyle(child).minInlineSize),
        }));
        expect(unrelated.direction, width + ' ' + dir + ' unrelated flex axis').toBe('row');
        expect(unrelated.minimums, width + ' ' + dir + ' unrelated children').toEqual(['auto', 'auto']);
        expect(geometry.nowrap.wrap).toBe('nowrap');
        expect(geometry.vertical, width + ' ' + dir + ' native vertical axis').toBe('column');
        expect(geometry.nowrap.shrink).toEqual(['1', '1']);
        if (width <= 412) {
          const [primary, secondary] = geometry.buttons;
          expect(geometry.nowrap.direction, width + ' ' + dir + ' native nowrap mobile axis').toBe('column');
          expect(primary.width, width + ' ' + dir + ' primary readable width').toBeGreaterThanOrEqual(width - 80);
          expect(secondary.width, width + ' ' + dir + ' secondary readable width').toBeGreaterThanOrEqual(width - 80);
          expect(geometry.links[0].width, width + ' ' + dir + ' primary mobile link readable width').toBeGreaterThanOrEqual(width - 80);
          expect(geometry.links[1].width, width + ' ' + dir + ' secondary mobile link readable width').toBeGreaterThanOrEqual(width - 80);
          expect(Math.abs(primary.left - secondary.left), width + ' ' + dir + ' stacked alignment').toBeLessThanOrEqual(2);
          expect(secondary.top, width + ' ' + dir + ' stacked order').toBeGreaterThanOrEqual(primary.bottom);
        }
        if (width >= 768) {
          expect(geometry.nowrap.direction, width + ' ' + dir + ' native desktop axis').toBe('row');
          const [primary, secondary] = geometry.buttons;
          expect(primary.width, width + " " + dir + " desktop readable width").toBeGreaterThanOrEqual(120);
          expect(secondary.width, width + " " + dir + " desktop readable width").toBeGreaterThanOrEqual(120);
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
    const customProof = await root.evaluate(node => {
      const group = node.querySelector(".wp-block-buttons.is-nowrap");
      const first = group.querySelector(".wp-block-button");
      first.classList.add("has-custom-width");
      const secondMin = getComputedStyle(first.nextElementSibling).minInlineSize;
      const direction = getComputedStyle(group).flexDirection;
      first.classList.remove("has-custom-width");
      return { secondMin, direction };
    });
    expect(customProof.secondMin, "custom width bypass").toBe("auto");
    expect(customProof.direction, "author width preserves native horizontal layout").toBe("row");
    for (const dir of ['ltr', 'rtl']) {
      await page.locator('html').evaluate((node, value) => { node.dir = value; node.style.fontSize = '200%'; }, dir);
      for (const zoom of ['200%', '400%']) {
      await page.locator('html').evaluate((node, value) => { node.style.fontSize = value; }, zoom);
      // Capture the failing enlarged-text layout before asserting. A document-wide
      // overflow may originate in site chrome or the article heading, not Buttons.
      // Report exact off-screen boxes instead of weakening the root overflow gate.
      const overflow = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const offenders = [...document.body.querySelectorAll('*')].map(node => {
          const r = node.getBoundingClientRect();
          return { tag: node.tagName.toLowerCase(), className: typeof node.className === 'string' ? node.className.slice(0, 100) : '',
            left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
            scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
        }).filter(r => r.left < -1 || r.right > viewport + 1)
          .sort((a, b) => Math.max(b.right - viewport, -b.left) - Math.max(a.right - viewport, -a.left)).slice(0, 12);
        return { delta: document.documentElement.scrollWidth - viewport, offenders };
      });
      expect(await root.locator('.wp-block-buttons.is-nowrap').evaluate(node => getComputedStyle(node).flexDirection),
        zoom + ' mobile reflow axis').toBe('column');
      expect(await page.locator('.slateframe-unrelated-nowrap').evaluate(node => getComputedStyle(node).flexDirection),
        zoom + ' unrelated flex axis').toBe('row');
      if (zoom === '400%') {
        await fs.mkdir('test-artifacts/screenshots', { recursive: true });
        // A viewport capture stays inside the strict visual-inventory 20,000px height cap;
        // offscreen element geometry above records the entire document overflow.
        // Show the actual two-action reflow, not the oversized article heading.
        await root.locator('.wp-block-buttons.is-nowrap > .wp-block-button').last().scrollIntoViewIfNeeded();
        await page.screenshot({ path: 'test-artifacts/screenshots/core-buttons-320-' + dir + '-400-zoom.png' });
      }
      expect(overflow.delta, zoom + ' offscreen elements: ' + JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(1);
      for (const button of await root.locator('.wp-block-buttons.is-nowrap > .wp-block-button').all()) {
        const r = await button.boundingBox();
        expect(r.width, dir + ' ' + zoom + ' stacked button readable width at text zoom').toBeGreaterThanOrEqual(240);
      }
      for (const link of await root.locator('.wp-block-button__link').all()) {
        const r = await link.boundingBox();
        if (await link.evaluate(node => node.closest('.wp-block-buttons.is-nowrap') !== null)) {
          expect(r.width, dir + ' ' + zoom + ' mobile link readable width at text zoom').toBeGreaterThanOrEqual(240);
        }
        expect(r.width).toBeGreaterThanOrEqual(43);
        expect(r.height).toBeGreaterThanOrEqual(43);
        expect(r.x).toBeGreaterThanOrEqual(-1);
        expect(r.x + r.width).toBeLessThanOrEqual(321);
        expect(await link.evaluate(node => parseFloat(getComputedStyle(node).paddingInlineStart)))
          .toBeLessThanOrEqual(12.5);
      }
      }
    }
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
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
