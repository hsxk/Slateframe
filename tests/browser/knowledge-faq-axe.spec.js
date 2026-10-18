const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

function violations(results) {
  return results.violations.map(({ id, impact, nodes }) => ({
    id, impact, targets: nodes.map(({ target }) => target),
  }));
}

test('registered Core FAQ disclosures meet WCAG A/AA when closed and expanded', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers mobile RTL and desktop LTR');
  const blocks = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-faq')['content'];");
  expect(blocks.match(/<!-- wp:details/g)).toHaveLength(3);
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe Core FAQ accessibility fixture', '--post_content=' + blocks, '--porcelain');
  try {
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const { width, direction } of [
      { width: 390, direction: 'rtl' },
      { width: 1440, direction: 'ltr' },
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
      await page.locator('html').evaluate((node, dir) => { node.dir = dir; }, direction);
      const faq = page.locator('.slateframe-prose .slateframe-knowledge-faq').first();
      const details = faq.locator('details.wp-block-details');
      const summaries = details.locator('summary');
      await expect(faq).toBeVisible();
      await expect(details).toHaveCount(3);
      await expect(summaries).toHaveCount(3);
      for (let index = 0; index < 3; index += 1) {
        await expect(summaries.nth(index)).toHaveAccessibleName(/\S/);
        await expect(details.nth(index)).not.toHaveAttribute('open');
      }
      for (const expanded of [false, true]) {
        if (expanded) {
          for (let index = 0; index < 3; index += 1) {
            const summary = summaries.nth(index);
            await summary.focus();
            await expect(summary).toBeFocused();
            await summary.press(index % 2 === 0 ? 'Enter' : 'Space');
            await expect(details.nth(index)).toHaveAttribute('open');
            await expect(details.nth(index).locator('p')).toBeVisible();
          }
        }
        const result = await new AxeBuilder({ page })
          .include('.slateframe-knowledge-faq')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(violations(result), width + 'px ' + direction + ' expanded=' + expanded).toEqual([]);
        const geometry = await faq.evaluate(node => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          heights: [...node.querySelectorAll('details > summary')].map(summary =>
            summary.getBoundingClientRect().height),
        }));
        expect(geometry.overflow, width + 'px ' + direction + ' expanded=' + expanded).toBeLessThanOrEqual(1);
        for (const height of geometry.heights) expect(height).toBeGreaterThanOrEqual(44);
        await faq.screenshot({
          path: 'test-artifacts/screenshots/knowledge-faq-axe-' + width + '-' + direction + '-' +
            (expanded ? 'expanded' : 'closed') + '.png',
        });
        if (expanded && width === 390) {
          await page.locator('html').evaluate(node => { node.style.fontSize = '200%'; });
          await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
          const zoomOverflow = await faq.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(zoomOverflow).toBeLessThanOrEqual(1);
          await faq.screenshot({
            path: 'test-artifacts/screenshots/knowledge-faq-axe-390-rtl-expanded-200-forced-colors.png',
          });
          await page.emulateMedia({ forcedColors: 'none' });
          await page.locator('html').evaluate(node => { node.style.fontSize = ''; });
        }
        if (expanded) {
          for (let index = 0; index < 3; index += 1) {
            const summary = summaries.nth(index);
            await summary.focus();
            await summary.press(index % 2 === 0 ? 'Space' : 'Enter');
            await expect(details.nth(index)).not.toHaveAttribute('open');
          }
        }
      }
    }
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
