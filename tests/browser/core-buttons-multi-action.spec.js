const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const action = (text, index) => '<!-- wp:button --><div class="wp-block-button">' +
  '<a class="wp-block-button__link wp-element-button" href="#slateframe-action-' + index + '">' +
  text + '</a></div><!-- /wp:button -->';
const labels = [
  '日本語 中文 العربية ' + 'LongUnbrokenPrimaryAction'.repeat(3),
  'Secondary / 次へ / التالي',
  'Tertiary / 继续 / متابعة',
];
const fixture = '<!-- wp:group {"className":"slateframe-three-actions"} -->' +
  '<div class="wp-block-group slateframe-three-actions">' +
  '<!-- wp:buttons {"layout":{"type":"flex","flexWrap":"nowrap"}} -->' +
  '<div class="wp-block-buttons is-nowrap">' + labels.map(action).join('') +
  '</div><!-- /wp:buttons -->' +
  labels.map((_, i) => '<p id="slateframe-action-' + i + '">Destination ' + i + '</p>').join('') +
  '</div><!-- /wp:group -->';

test('three native Core Buttons remain readable and keyboard reachable at mobile text zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers all widths.');
  test.setTimeout(180000);
  const postId = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe three actions ' + randomUUID(), '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?page_id=' + postId, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-three-actions');
    const group = root.locator('.wp-block-buttons.is-nowrap');
    await expect(group.locator('.wp-block-button__link')).toHaveCount(3);
    await expect(page.locator('style#slateframe-core-buttons-inline-css,link#slateframe-core-buttons-css'))
      .toHaveCount(1);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width <= 412 ? [16, 32, 64] : [16]) {
          await setRootTextScale(page, font, dir);
          const state = await group.evaluate(node => {
            const rect = element => {
              const r = element.getBoundingClientRect();
              return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
                width: r.width, height: r.height };
            };
            const items = [...node.querySelectorAll(':scope > .wp-block-button')];
            return { group: rect(node), direction: getComputedStyle(node).flexDirection,
              wrap: getComputedStyle(node).flexWrap, items: items.map(rect),
              links: items.map(item => rect(item.querySelector('a'))),
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.items, label).toHaveLength(3);
          expect(state.wrap, label).toBe('nowrap');
          expect(state.group.left, label + ' left').toBeGreaterThanOrEqual(-1);
          expect(state.group.right, label + ' right').toBeLessThanOrEqual(width + 1);
          if (width <= 412) {
            expect(state.direction, label + ' stacked mobile axis').toBe('column');
            for (let i = 1; i < 3; i++) {
              expect(state.items[i].top, label + ' stacking order').toBeGreaterThanOrEqual(state.items[i - 1].bottom - 1);
              expect(Math.abs(state.items[i].left - state.items[0].left), label + ' alignment')
                .toBeLessThanOrEqual(2);
            }
          } else {
            expect(state.direction, label + ' authored desktop axis').toBe('row');
            expect(state.links[1].width, label + ' secondary action readability').toBeGreaterThanOrEqual(88);
            expect(state.links[2].width, label + ' tertiary action readability').toBeGreaterThanOrEqual(88);
          }
          for (const rect of [...state.items, ...state.links]) {
            expect(rect.left, label + ' control left').toBeGreaterThanOrEqual(state.group.left - 1);
            expect(rect.right, label + ' control right').toBeLessThanOrEqual(state.group.right + 1);
            expect(rect.width, label + ' control width').toBeGreaterThanOrEqual(43);
          }
          for (const rect of state.links) expect(rect.height, label + ' 44px target').toBeGreaterThanOrEqual(43);
          expect(state.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await root.screenshot({ path: 'test-artifacts/screenshots/core-buttons-three-' + width + '-' + dir + '.png' });
          }
          if (font === 64 && width === 390) {
            await root.screenshot({ path: 'test-artifacts/screenshots/core-buttons-three-390-' + dir + '-400.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const link = group.locator('a').first();
    await link.focus();
    await expect(link).toBeFocused();
    await expect.poll(() => link.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const a11y = await new AxeBuilder({ page }).include('.slateframe-three-actions')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-buttons-three-390-rtl-200-forced-colors.png' });
  } finally {
    wp('post', 'delete', postId, '--force');
  }
});
