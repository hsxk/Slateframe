const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('Core flex Group contains long multilingual children across responsive and zoom states', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Single disposable WordPress fixture exercises every width');
  test.setTimeout(150000);
  const slug = 'slateframe-group-flex-' + randomUUID().slice(0, 12);
  const longText = 'UnbrokenIdentifier'.repeat(12) + '日本語中文العربية';
  const content = '<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap"}} -->' +
    '<div class="wp-block-group is-layout-flex is-nowrap">' +
    '<!-- wp:paragraph --><p>' + longText + '</p><!-- /wp:paragraph -->' +
    '<!-- wp:paragraph --><p><a href="#group-end">Accessible link</a></p><!-- /wp:paragraph -->' +
    '</div><!-- /wp:group -->' +
    '<!-- wp:paragraph --><p id="group-end">End of content</p><!-- /wp:paragraph -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const group = page.locator('.wp-block-group.is-layout-flex').first();
    await expect(group.locator('p')).toHaveCount(2);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const state = await group.evaluate(node => {
            const rect = element => element.getBoundingClientRect().toJSON();
            return {
              pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              overflowCandidates: Array.from(document.querySelectorAll('body *')).map(element => ({
                element,
                bounds: element.getBoundingClientRect()
              })).filter(({ bounds }) => bounds.width && (bounds.left < -1 || bounds.right > innerWidth + 1))
                .slice(0, 12).map(({ element, bounds }) => ({
                  tag: element.tagName.toLowerCase(),
                  className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
                  left: Math.round(bounds.left),
                  right: Math.round(bounds.right),
                  scrollWidth: element.scrollWidth,
                  clientWidth: element.clientWidth,
                  text: element.textContent?.trim().slice(0, 100),
                  html: element.outerHTML.slice(0, 350),
                  parent: element.parentElement?.outerHTML.slice(0, 350),
                  position: getComputedStyle(element).position
                })),
              group: rect(node),
              groupWrap: getComputedStyle(node).flexWrap,
              children: Array.from(node.children, rect),
              styles: Array.from(node.children, element => ({
                minInline: getComputedStyle(element).minInlineSize,
                maxInline: getComputedStyle(element).maxInlineSize,
                wrap: getComputedStyle(element).overflowWrap
              }))
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          if (state.pageOverflow > 1) {
            await page.screenshot({
              path: 'test-artifacts/screenshots/core-group-flex-overflow-' + width + '-' + dir + '-' + font + '.png',
              fullPage: true
            });
          }
          expect(state.pageOverflow, label + ' document overflow; candidates=' + JSON.stringify(state.overflowCandidates)).toBeLessThanOrEqual(1);
          if (width <= 480) expect(state.groupWrap, label + ' paragraph group reflow').toBe('wrap');
          expect(state.group.left, label + ' group left').toBeGreaterThanOrEqual(-1);
          expect(state.group.right, label + ' group right').toBeLessThanOrEqual(width + 1);
          for (const [index, child] of state.children.entries()) {
            expect(child.left, label + ' child ' + index + ' left').toBeGreaterThanOrEqual(-1);
            expect(child.right, label + ' child ' + index + ' right').toBeLessThanOrEqual(width + 1);
            expect(state.styles[index].minInline).toBe('0px');
            expect(state.styles[index].maxInline).toBe('100%');
            expect(state.styles[index].wrap).toBe('anywhere');
          }
          if (width === 390 && (font === 16 || font === 64)) {
            await page.screenshot({ path: 'test-artifacts/screenshots/core-group-flex-390-' + dir + '-' + font + '.png', fullPage: true });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 32, 'rtl');
    await group.locator('a').focus();
    await expect(group.locator('a')).toBeFocused();
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});
