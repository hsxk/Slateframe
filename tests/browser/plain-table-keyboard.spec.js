const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

test('plain Core HTML table stays semantic and keyboard scrollable in RTL and LTR', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Resize one isolated WordPress fixture');
  const cells = Array.from({ length: 8 }, (_, i) => `<td>Column ${i + 1} — 中文 日本語</td>`).join('');
  const html = '<!-- wp:html --><table class="slateframe-plain-table"><caption>Wide reference table</caption>' +
    `<tbody><tr>${cells}</tr></tbody></table><!-- /wp:html -->`;
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Plain table keyboard fixture', '--post_content=' + html, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const table = page.locator('.slateframe-prose > table.slateframe-plain-table');
    await expect(table).toBeVisible();
    await expect(table).not.toHaveAttribute('tabindex');
    await expect(table.locator('caption')).toHaveText('Wide reference table');
    await expect(table.locator('td')).toHaveCount(8);
    await table.evaluate(node => {
      const button = document.createElement('button');
      button.className = 'slateframe-before-table';
      button.textContent = 'Before table';
      node.before(button);
    });
    const before = page.locator('.slateframe-before-table');
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(value => { document.documentElement.dir = value; }, dir);
        const geometry = await table.evaluate(node => ({
          overflow: getComputedStyle(node).overflowX,
          scroll: node.scrollWidth,
          client: node.clientWidth,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        expect(geometry.overflow).toBe('auto');
        expect(geometry.pageOverflow, `${width}px ${dir}`).toBeLessThanOrEqual(1);
        if (width <= 412) {
          expect(geometry.scroll).toBeGreaterThan(geometry.client);
          await before.focus();
          await page.keyboard.press('Tab');
          await expect(table).toBeFocused();
          expect(await table.evaluate(node => node.matches(':focus-visible'))).toBe(true);
          await table.evaluate(node => { node.scrollLeft = 0; });
          await page.keyboard.press(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
          await expect.poll(async () => Math.abs(await table.evaluate(node => node.scrollLeft)),
            { timeout: 3000 }).toBeGreaterThan(0);
        }
      }
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.style.fontSize = '200%';
    });
    await page.emulateMedia({ forcedColors: 'active' });
    await before.focus();
    await page.keyboard.press('Tab');
    await expect(table).toBeFocused();
    const focus = await table.evaluate(node => ({
      visible: node.matches(':focus-visible'),
      width: parseFloat(getComputedStyle(node).outlineWidth),
      offset: parseFloat(getComputedStyle(node).outlineOffset),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(focus.visible).toBe(true);
    expect(focus.width).toBeGreaterThanOrEqual(2);
    expect(focus.offset).toBeLessThanOrEqual(0);
    expect(focus.pageOverflow).toBeLessThanOrEqual(1);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await table.screenshot({ path: 'test-artifacts/screenshots/plain-table-320-rtl-200-forced-colors.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
