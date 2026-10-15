const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const postPath = process.env.SLATEFRAME_POST_PATH;

test('Core Footnotes keep print references compact without changing screen targets', async ({ page }, info) => {
  test.skip(!postPath, 'Requires a real published WordPress article.');
  const width = info.project.use.viewport?.width || 1440;
  test.skip(![390, 1440].includes(width), 'Representative print viewport evidence.');
  await page.goto(postPath, { waitUntil: 'networkidle' });
  await expect(page.locator('link#slateframe-print-css[media="print"]')).toHaveCount(1);
  const article = page.locator('article.slateframe-entry > .slateframe-prose');
  await expect(article).toBeVisible();
  await article.evaluate((root) => {
    const section = document.createElement('section');
    section.className = 'slateframe-print-footnotes-fixture';
    section.innerHTML = '<p>Printed reference <sup id="fnref-print"><a href="#fn-print">1</a></sup></p><ol class="wp-block-footnotes"><li id="fn-print">Footnote 日本語 中文 العربية <a href="#fnref-print" aria-label="Return to reference">↩</a></li></ol>';
    root.append(section);
  });
  const backreference = article.locator('.slateframe-print-footnotes-fixture .wp-block-footnotes a');
  await page.emulateMedia({ media: 'screen' });
  const screenSize = await backreference.evaluate((node) => node.getBoundingClientRect().height);
  expect(screenSize).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await article.locator('.slateframe-print-footnotes-fixture a[href="#fn-print"]').click();
  const footnoteTarget = article.locator('#fn-print');
  await expect(footnoteTarget).toHaveCSS('outline-style', 'solid');
  await backreference.focus();
  await page.emulateMedia({ media: 'print' });
  const printMetrics = await backreference.evaluate((node) => {
    const styles = getComputedStyle(node);
    return {
      printHeight: node.getBoundingClientRect().height,
      printWidth: node.getBoundingClientRect().width,
      color: styles.color,
      focusOutline: styles.outlineStyle,
      targetOutline: getComputedStyle(document.querySelector('#fn-print')).outlineStyle,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(printMetrics.printHeight).toBeLessThan(44);
  expect(printMetrics.color).toBe('rgb(0, 0, 0)');
  expect(printMetrics.focusOutline).toBe('none');
  expect(printMetrics.targetOutline).toBe('none');
  expect(printMetrics.printWidth).toBeLessThan(44);
  expect(printMetrics.pageOverflow).toBeLessThanOrEqual(1);
  await page.emulateMedia({ media: 'screen' });
  await backreference.click();
  const sourceTarget = article.locator('#fnref-print');
  await expect(sourceTarget).toHaveCSS('outline-style', 'solid');
  await page.emulateMedia({ media: 'print' });
  await expect(sourceTarget).toHaveCSS('outline-style', 'none');
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await article.locator('.slateframe-print-footnotes-fixture').screenshot({
    path: path.join('test-artifacts/screenshots', `core-footnotes-print-${width}-rtl.png`),
  });
});
