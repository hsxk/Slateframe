const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const source = '<!-- wp:details --><details class="wp-block-details"><summary>日本語 中文 العربية — ' +
  'LongUnbrokenDisclosure'.repeat(8) + '</summary><!-- wp:paragraph --><p class="details-answer">Native disclosure answer.</p><!-- /wp:paragraph --></details><!-- /wp:details -->' +
  '<!-- wp:details {"showContent":true,"className":"is-style-slateframe-disclosure"} --><details class="wp-block-details is-style-slateframe-disclosure" open><summary>Open knowledge explanation</summary><!-- wp:paragraph --><p>First body paragraph.</p><!-- /wp:paragraph --></details><!-- /wp:details -->';

test('real WordPress Core Details preserves bounded keyboard, RTL and zoom behavior', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One fixture covers all seven widths');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Details keyboard fixture', '--post_content=' + source, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const details = page.locator('.slateframe-prose details.wp-block-details');
    await expect(details).toHaveCount(2);
    const closed = details.first(), open = details.nth(1), summary = closed.locator('summary');
    await expect(closed).not.toHaveAttribute('open');
    await expect(open).toHaveAttribute('open');
    await expect(closed.locator('.details-answer')).toBeHidden();
    for (const control of [44, 48, 56]) {
      await page.evaluate(value => document.documentElement.style.setProperty('--slateframe-control', value + 'px'), control);
      for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const dir of ['ltr', 'rtl']) {
          await page.evaluate(value => { document.documentElement.dir = value; }, dir);
          const m = await summary.evaluate(node => ({
            height: node.getBoundingClientRect().height,
            display: getComputedStyle(node).display,
            wrap: getComputedStyle(node).overflowWrap,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }));
          expect(m.height, width + ' ' + dir + ' ' + control).toBeGreaterThanOrEqual(control - 1);
          expect(m.display).toBe('list-item');
          expect(m.wrap).toBe('anywhere');
          expect(m.overflow, width + ' ' + dir).toBeLessThanOrEqual(1);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    await summary.focus();
    await expect(summary).toBeFocused();
    await summary.press('Enter');
    await expect(closed).toHaveAttribute('open');
    await expect(closed.locator('.details-answer')).toBeVisible();
    await summary.press('Space');
    await expect(closed).not.toHaveAttribute('open');
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.keyboard.press('Tab');
    await summary.focus();
    const focus = await summary.evaluate(node => ({
      visible: node.matches(':focus-visible'),
      outline: getComputedStyle(node).outlineStyle,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(focus.visible).toBe(true);
    expect(focus.outline).not.toBe('none');
    expect(focus.overflow).toBeLessThanOrEqual(1);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await page.locator('.slateframe-prose').screenshot({
      path: 'test-artifacts/screenshots/core-details-390-rtl-200-forced-colors.png',
    });
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    await expect(closed).not.toHaveAttribute('open');
    await expect(open).toHaveAttribute('open');
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
