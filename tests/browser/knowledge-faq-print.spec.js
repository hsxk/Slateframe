const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const slug = 'slateframe/knowledge-faq';
const viewport = (info) => info.project.use.viewport?.width || 0;

test('native closed Knowledge FAQ answers remain readable when printed', async ({ page }, info) => {
  // The same registered Core pattern is exercised by the on-screen and editor tests.
  const blocks = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('" + slug + "')['content'];");
  expect(blocks).toContain('<!-- wp:details');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe print FAQ fixture', '--post_content=' + blocks, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const faq = page.locator('.slateframe-prose .slateframe-knowledge-faq').first();
    const details = faq.locator('details.wp-block-details');
    await expect(details).toHaveCount(3);
    const answers = details.locator(':scope > p');
    await expect(answers).toHaveCount(3);
    for (const item of await details.all()) await expect(item).not.toHaveAttribute('open');
    for (const answer of await answers.all()) await expect(answer).toBeHidden();

    await page.emulateMedia({ media: 'print' });
    for (const direction of ['ltr', 'rtl']) {
      await page.emulateMedia({ media: 'print', forcedColors: direction === 'rtl' ? 'active' : 'none' });
      await page.locator('html').evaluate((root, dir) => {
        root.dir = dir;
        root.style.fontSize = '200%';
      }, direction);
      for (const answer of await answers.all()) await expect(answer).toBeVisible();
      const measurements = await details.evaluateAll((nodes) => nodes.map((node) => {
        const answer = node.querySelector(':scope > p');
        const summary = node.querySelector(':scope > summary');
        const rect = answer.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(answer);
        const text = range.getBoundingClientRect();
        const summaryBox = summary.getBoundingClientRect();
        return {
          open: node.hasAttribute('open'),
          display: getComputedStyle(answer).display,
          printContentVisibility: getComputedStyle(node, '::details-content').contentVisibility,
          answerHeight: rect.height,
          textHeight: text.height,
          textLeft: text.left,
          textRight: text.right,
          summaryBottom: summaryBox.bottom,
          printMarker: getComputedStyle(summary).listStyleType,
          answerTop: rect.top,
          viewport: document.documentElement.clientWidth,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }));
      for (const result of measurements) {
        expect(result.open, 'printing must not mutate Core Details state').toBe(false);
        expect(result.display, 'closed answer must be present in print layout').toBe('block');
        expect(result.printContentVisibility).toBe('visible');
        expect(result.printMarker, 'print should not suggest an interactive disclosure').toBe('none');
        expect(result.answerHeight).toBeGreaterThan(0);
        expect(result.textHeight).toBeGreaterThan(0);
        expect(result.answerTop).toBeGreaterThanOrEqual(result.summaryBottom - 1);
        expect(result.textLeft).toBeGreaterThanOrEqual(-1);
        expect(result.textRight).toBeLessThanOrEqual(result.viewport + 1);
        expect(result.overflow).toBeLessThanOrEqual(1);
      }
      if ([390, 1440].includes(viewport(info))) {
        const directory = path.resolve('test-artifacts/screenshots');
        await fs.mkdir(directory, { recursive: true });
        await page.screenshot({
          path: path.join(directory, `viewport-${viewport(info)}-knowledge-faq-print-${direction}-200${direction === 'rtl' ? '-forced-colors' : ''}.png`),
          fullPage: true,
        });
      }
    }
    await page.emulateMedia({ media: 'screen' });
    for (const answer of await answers.all()) await expect(answer).toBeHidden();
    for (const item of await details.all()) await expect(item).not.toHaveAttribute('open');
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
