const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

test('real WordPress Classic pre has native keyboard focus and bounded RTL scrolling', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One fixture resized across widths');
  const source = '<pre class="slateframe-classic-pre">' + '0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ '.repeat(40) + '</pre>';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Classic pre keyboard fixture', '--post_content=' + source, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const pre = page.locator('.slateframe-prose pre.slateframe-classic-pre');
    await expect(pre).toBeVisible();
    await expect(pre).not.toHaveAttribute('tabindex');
    await pre.evaluate(node => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'slateframe-pre-focus-before';
      marker.setAttribute('aria-label', 'Before preformatted code');
      marker.style.cssText = 'position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%)';
      node.before(marker);
    });
    const before = page.locator('.slateframe-pre-focus-before');
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(value => { document.documentElement.dir = value; }, dir);
        const g = await pre.evaluate(node => ({
          overflow: getComputedStyle(node).overflowX, scroll: node.scrollWidth,
          client: node.clientWidth,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        expect(g.overflow, width + ' ' + dir).toBe('auto');
        expect(g.scroll).toBeGreaterThan(g.client);
        expect(g.pageOverflow).toBeLessThanOrEqual(1);
        if (width <= 412) {
          await before.focus();
          await page.keyboard.press('Tab');
          await expect(pre).toBeFocused();
          expect(await pre.evaluate(node => node.matches(':focus-visible'))).toBe(true);
          await pre.evaluate(node => { node.scrollLeft = 0; });
          await page.keyboard.press(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
          await expect.poll(async () => Math.abs(await pre.evaluate(node => node.scrollLeft)),
            { timeout: 3000 }).toBeGreaterThan(0);
        }
      }
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '400%'; });
    await page.emulateMedia({ forcedColors: 'active' });
    await before.focus();
    await page.keyboard.press('Tab');
    await expect(pre).toBeFocused();
    const focus = await pre.evaluate(node => ({
      visible: node.matches(':focus-visible'),
      width: parseFloat(getComputedStyle(node).outlineWidth),
      offset: parseFloat(getComputedStyle(node).outlineOffset),
      style: getComputedStyle(node).outlineStyle,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(focus.visible).toBe(true);
    expect(focus.style).not.toBe('none');
    expect(focus.width).toBeGreaterThanOrEqual(2);
    expect(focus.offset).toBeLessThanOrEqual(0);
    expect(focus.pageOverflow).toBeLessThanOrEqual(1);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await pre.screenshot({ path: 'test-artifacts/screenshots/classic-pre-320-rtl-400-forced-colors.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
