const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native named Details groups remain exclusive without affecting independent disclosures', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One isolated WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-details-group-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:details {"name":"slateframe-faq-group","className":"slateframe-faq-first"} -->' +
    '<details class="wp-block-details slateframe-faq-first" name="slateframe-faq-group"><summary>日本語 中文 العربية VeryLongNativeDisclosureLabelRepeatedManyTimesVeryLongNativeDisclosureLabelRepeatedManyTimes</summary>' +
    '<!-- wp:paragraph --><p>First native answer.</p><!-- /wp:paragraph --></details><!-- /wp:details -->' +
    '<!-- wp:details {"name":"slateframe-faq-group","className":"slateframe-faq-second"} -->' +
    '<details class="wp-block-details slateframe-faq-second" name="slateframe-faq-group"><summary>Second native disclosure</summary>' +
    '<!-- wp:paragraph --><p>Second native answer.</p><!-- /wp:paragraph --></details><!-- /wp:details -->' +
    '<!-- wp:details {"className":"slateframe-faq-independent"} -->' +
    '<details class="wp-block-details slateframe-faq-independent"><summary>Independent disclosure</summary>' +
    '<!-- wp:paragraph --><p>Independent native answer.</p><!-- /wp:paragraph --></details><!-- /wp:details -->';
  let postId;
  try {
    postId = wp('post', 'create', '--post_type=post', '--post_status=publish',
      '--post_title=' + slug, '--post_name=' + slug, '--post_content=' + content, '--porcelain');
    await page.goto('/?p=' + postId, { waitUntil: 'networkidle' });
    const first = page.locator('.slateframe-faq-first');
    const second = page.locator('.slateframe-faq-second');
    const independent = page.locator('.slateframe-faq-independent');
    const firstSummary = first.locator(':scope > summary');
    const secondSummary = second.locator(':scope > summary');
    const independentSummary = independent.locator(':scope > summary');
    await expect(first).toHaveAttribute('name', 'slateframe-faq-group');
    await expect(second).toHaveAttribute('name', 'slateframe-faq-group');
    await expect(independent).not.toHaveAttribute('name');
    await expect(first).not.toHaveAttribute('open');
    await expect(second).not.toHaveAttribute('open');
    await firstSummary.focus();
    await firstSummary.press('Enter');
    await expect(first).toHaveAttribute('open', '');
    await secondSummary.focus();
    await secondSummary.press('Enter');
    await expect(second).toHaveAttribute('open', '');
    await expect(first).not.toHaveAttribute('open');
    await independentSummary.focus();
    await independentSummary.press('Enter');
    await expect(independent).toHaveAttribute('open', '');
    await expect(second).toHaveAttribute('open', '');
    await firstSummary.focus();
    await firstSummary.press('Space');
    await expect(first).toHaveAttribute('open', '');
    await expect(second).not.toHaveAttribute('open');
    await expect(independent).toHaveAttribute('open', '');
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-details-inline-css') ||
      document.getElementById('slateframe-core-details-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir;
            node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await firstSummary.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            rect: node.getBoundingClientRect().toJSON(),
            display: getComputedStyle(node).display
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' page overflow').toBeLessThanOrEqual(1);
          expect(state.rect.left, label + ' left bound').toBeGreaterThanOrEqual(-1);
          expect(state.rect.right, label + ' right bound').toBeLessThanOrEqual(width + 1);
          expect(state.rect.height, label + ' summary target').toBeGreaterThanOrEqual(43);
          expect(state.display, label + ' native marker').toBe('list-item');
          if (font === 16) {
            await page.screenshot({ fullPage: true,
              path: 'test-artifacts/screenshots/core-details-grouping-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await firstSummary.focus();
    await expect(firstSummary).toBeFocused();
    expect(await firstSummary.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({ page }).include('.slateframe-faq-first')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.screenshot({ fullPage: true,
      path: 'test-artifacts/screenshots/core-details-grouping-390-rtl-200-forced-colors.png' });
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-details-inline-css') ||
      document.getElementById('slateframe-core-details-css')
    ))).toBe(false);
  } finally {
    if (postId) wp('post', 'delete', postId, '--force');
  }
});
