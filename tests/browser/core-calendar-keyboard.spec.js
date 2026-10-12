const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const viewport = info => info.project.use.viewport?.width || 1440;

test('real Core Calendar keeps keyboard scrolling at zoom in LTR and RTL', async ({ page }, info) => {
  // One isolated WP-CLI fixture per suite; resize the same document through all widths.
  test.skip(viewport(info) !== 390);
  const cases = JSON.parse(wp('eval', `
    $native = '<div class="wp-block-calendar"><table><caption>October</caption></table></div>';
    $authored = '<div class="wp-block-calendar" tabindex="-1"><table></table></div>';
    $other = '<div class="not-a-calendar"><table></table></div>';
    echo wp_json_encode( array(
      'added' => false !== strpos( apply_filters( 'render_block_core/calendar', $native ), 'tabindex="0"' ),
      'preserved' => false !== strpos( apply_filters( 'render_block_core/calendar', $authored ), 'tabindex="-1"' ),
      'untouched' => $other === apply_filters( 'render_block_core/calendar', $other ),
    ) );
  `));
  expect(cases).toEqual({ added: true, preserved: true, untouched: true });
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Calendar keyboard fixture', '--post_content=<!-- wp:calendar /-->', '--porcelain');
  try {
    await page.goto(`/?page_id=${id}`, { waitUntil: 'networkidle' });
    const calendar = page.locator('.slateframe-prose .wp-block-calendar').first();
    await expect(calendar).toBeVisible();
    await expect(calendar).toHaveAttribute('tabindex', '0');
    await expect(calendar.locator('table')).toBeVisible();
    await page.addStyleTag({ content: '.slateframe-prose .wp-block-calendar table{min-inline-size:760px}' });

    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(value => { document.documentElement.dir = value; }, dir);
        const geometry = await calendar.evaluate(node => ({
          overflow: getComputedStyle(node).overflowX,
          client: node.clientWidth,
          scroll: node.scrollWidth,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        expect(geometry.overflow, `${width}px ${dir}`).toBe('auto');
        expect(geometry.pageOverflow, `${width}px ${dir}`).toBeLessThanOrEqual(1);
        if (width <= 412) {
          expect(geometry.scroll, `${width}px ${dir}`).toBeGreaterThan(geometry.client);
          await calendar.focus();
          await expect(calendar).toBeFocused();
          await calendar.evaluate(node => { node.scrollLeft = 0; });
          await page.keyboard.press(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
          await expect.poll(async () => Math.abs(await calendar.evaluate(node => node.scrollLeft)),
            { timeout: 3000 }).toBeGreaterThan(0);
        }
      }
    }

    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.style.fontSize = '200%';
    });
    await page.emulateMedia({ forcedColors: 'active' });
    await calendar.focus();
    const zoom = await calendar.evaluate(node => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollable: node.scrollWidth > node.clientWidth,
      outline: getComputedStyle(node).outlineStyle,
    }));
    expect(zoom.overflow).toBeLessThanOrEqual(1);
    expect(zoom.scrollable).toBe(true);
    expect(zoom.outline).not.toBe('none');
    await calendar.screenshot({ path: 'test-artifacts/screenshots/core-calendar-keyboard-390-rtl-200-forced-colors.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
