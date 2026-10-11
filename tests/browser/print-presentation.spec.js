const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const postPath = process.env.SLATEFRAME_POST_PATH;
const width = (info) => Number(info.project.name.replace('viewport-', ''));

test('Core print presentation preserves readable article content', async ({ page }, info) => {
  expect(postPath, 'CI must publish a real WordPress article').toBeTruthy();
  await page.goto(postPath, { waitUntil: 'networkidle' });
  await expect(page.locator('article.slateframe-entry > .slateframe-prose')).toBeVisible();
  await expect(page.locator('link#slateframe-print-css[media="print"]')).toHaveCount(1);

  await page.evaluate(() => {
    const prose = document.querySelector('article.slateframe-entry > .slateframe-prose');
    prose.insertAdjacentHTML('beforeend', [
      '<h2 class="print-heading">Print heading 中文 日本語 العربية</h2>',
      '<figure class="print-figure"><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2280%22/%3E" alt="Fixture"><figcaption>Caption</figcaption></figure>',
      '<blockquote class="print-quote"><p>Quoted article text</p></blockquote>',
      '<figure class="print-portrait-figure"><img class="print-portrait" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%222400%22%3E%3Crect width=%22800%22 height=%222400%22 fill=%22%234d83a8%22/%3E%3C/svg%3E" alt="Tall portrait figure"><figcaption>Portrait figure</figcaption></figure>',
      '<div class="wp-block-group has-background print-callout" style="background-color:#111;color:#eee"><p>Dark author callout</p></div>',
      '<pre class="print-code">very_long_print_identifier_without_breaks_or_whitespace_should_wrap_in_print_mode</pre>',
      '<div class="wp-block-table print-table"><table><thead><tr><th>Period</th><th>Value</th><th>Growth</th><th>Note</th></tr></thead><tbody><tr><td>2026</td><td>100</td><td>5%</td><td>財務データ_بيانات_verylongreference</td></tr></tbody></table></div>',
      '<table class="print-raw-table"><thead><tr><th>中文</th><th>日本語</th></tr></thead><tbody><tr><td>Content</td><td>Article</td></tr></tbody></table>',
      '<div class="wp-block-spacer print-spacer" style="height:180px"></div>',
      '<div class="wp-block-cover"><span class="wp-block-cover__background has-background-dim"></span><img class="wp-block-cover__image-background" alt="" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%222400%22/%3E"><div class="wp-block-cover__inner-container"><p>Cover content</p></div></div>',
      '<details open><summary>More detail</summary><p class="print-details-body">Preserved disclosure text</p></details>',
      '<div class="wp-block-buttons"><div class="wp-block-button"><a class="wp-block-button__link" href="#main-content">Print link</a></div></div>',
      '<p><a class="print-link" href="#main-content">Article link</a></p>'
    ].join(''));
    document.querySelector('main').insertAdjacentHTML('beforeend',
      '<aside class="slateframe-related print-related">Related reading</aside><nav class="slateframe-pagination print-pagination">Older pages</nav>');
    document.body.insertAdjacentHTML('beforeend', '<div class="wp-lightbox-overlay print-overlay">Lightbox</div>');
  });

  if (width(info) <= 768) {
    await page.locator('html').evaluate((el) => {
      el.dir = 'rtl';
      el.dataset.slateframeColorMode = 'dark';
      el.style.fontSize = '200%';
    });
  }

  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('.slateframe-site-header')).toBeVisible();
  expect(await page.locator('.print-spacer').evaluate((el) => getComputedStyle(el).height)).toBe('180px');
  await page.emulateMedia({ media: 'print' });

  const s = await page.evaluate(() => {
    const style = (q) => getComputedStyle(document.querySelector(q));
    const box = (q) => document.querySelector(q).getBoundingClientRect();
    return {
      header: style('.slateframe-site-header').display,
      footer: style('.slateframe-site-footer').display,
      related: style('.print-related').display,
      lightbox: style('.print-overlay').display,
      mainHeight: style('.slateframe-main').minHeight,
      paper: style('body').backgroundColor,
      paperInset: parseFloat(style('body').paddingInlineStart),
      contentLeft: box('.slateframe-main').left,
      contentRight: box('.slateframe-main').right,
      ink: style('body').color,
      codeOverflow: style('.print-code').overflowX,
      codeHeight: style('.print-code').maxHeight,
      codeWrap: style('.print-code').overflowWrap,
      calloutBackground: style('.print-callout').backgroundColor,
      calloutInk: style('.print-callout p').color,
      link: style('.print-link').textDecorationLine,
      headingBreak: style('.print-heading').breakAfter,
      figureBreak: style('.print-figure').breakInside,
      tableHead: style('.print-table thead').display,
      tableScroll: style('.print-table').overflowX,
      tableWidth: box('.print-table table').width,
      tableContainerWidth: box('.print-table').width,
      rawTableWidth: box('.print-raw-table').width,
      rawTableDisplay: style('.print-raw-table').display,
      spacerHeight: style('.print-spacer').height,
      pageNav: style('.print-pagination').display,
      coverImagePosition: style('.wp-block-cover__image-background').position,
      coverImageDisplay: style('.wp-block-cover__image-background').display,
      coverImageHeight: box('.wp-block-cover__image-background').height,
      coverImageWidth: box('.wp-block-cover__image-background').width,
      coverWidth: box('.wp-block-cover').width,
      portraitHeight: box('.print-portrait').height,
      portraitWidth: box('.print-portrait').width,
      portraitContainerWidth: box('.print-portrait-figure').width,
      coverBackground: style('.wp-block-cover__background').display,
      coverText: style('.wp-block-cover__inner-container p').color,
      boxSizing: style('.print-code').boxSizing,
      details: style('.print-details-body').display,
      border: style('.wp-block-button__link').borderTopStyle,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  for (const q of ['header', 'footer', 'related', 'lightbox', 'pageNav', 'coverBackground']) {
    expect(s[q], q).toBe('none');
  }
  expect(s.mainHeight).toBe('0px');
  expect(s.paper).toBe('rgb(255, 255, 255)');
  expect(s.paperInset).toBeGreaterThanOrEqual(8);
  expect(s.contentLeft).toBeGreaterThanOrEqual(s.paperInset - 1);
  expect(s.contentRight).toBeLessThanOrEqual(info.project.use.viewport.width - s.paperInset + 1);
  expect(s.ink).toBe('rgb(0, 0, 0)');
  expect(s.codeOverflow).toBe('visible');
  expect(s.codeHeight).toBe('none');
  expect(s.codeWrap).toBe('anywhere');
  expect(s.calloutBackground).toBe('rgba(0, 0, 0, 0)');
  expect(s.calloutInk).toBe('rgb(0, 0, 0)');
  expect(s.link).toContain('underline');
  expect(s.headingBreak).toBe('avoid');
  expect(s.figureBreak).toBe('avoid');
  expect(s.tableHead).toBe('table-header-group');
  expect(s.tableScroll).toBe('visible');
  expect(s.tableWidth).toBeLessThanOrEqual(s.tableContainerWidth + 1);
  expect(s.rawTableDisplay).toBe('table');
  expect(s.rawTableWidth).toBeLessThanOrEqual(info.project.use.viewport.width + 1);
  expect(s.spacerHeight).toBe('0px');
  expect(s.coverImagePosition).toBe('static');
  expect(s.coverImageDisplay).toBe('block');
  expect(s.coverImageHeight).toBeGreaterThan(0);
  expect(s.coverImageHeight).toBeLessThanOrEqual(700);
  expect(s.coverImageWidth).toBeLessThanOrEqual(s.coverWidth + 1);
  expect(Math.abs(s.coverImageHeight / s.coverImageWidth - 2)).toBeLessThanOrEqual(0.05);
  expect(s.portraitHeight).toBeGreaterThan(0);
  expect(s.portraitHeight).toBeLessThanOrEqual(700);
  expect(s.portraitWidth).toBeLessThanOrEqual(s.portraitContainerWidth + 1);
  expect(Math.abs(s.portraitHeight / s.portraitWidth - 3)).toBeLessThanOrEqual(0.05);
  expect(s.coverText).toBe('rgb(0, 0, 0)');
  expect(s.boxSizing).toBe('border-box');
  expect(s.details).toBe('block');
  expect(s.border).toBe('solid');
  expect(s.overflow).toBeLessThanOrEqual(1);

  if ([390, 1440].includes(width(info))) {
    const dir = path.resolve('test-artifacts/screenshots');
    await fs.mkdir(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'print-article-' + info.project.name + '.png'), fullPage: true });
  }
});
