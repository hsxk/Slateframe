const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const separation = '<p>Article section — العربية 中文 日本語 with a native reading anchor.</p>'.repeat(20);

const fixture = `<section class="slateframe-core-footnotes-fixture">
  <p>Core reference <sup id="fnref-slateframe-core"><a href="#fn-slateframe-core">1</a></sup> with normal inline reading flow.</p>
  ${separation}
  <ol class="wp-block-footnotes"><li id="fn-slateframe-core">日本語中文 — العربية — ${'long-footnote-reference-'.repeat(8)} <a href="#fnref-slateframe-core" aria-label="Return to reference">↩</a></li></ol>
</section>`;

async function openArticle(page) {
  const postPath = process.env.SLATEFRAME_POST_PATH;
  if (postPath) {
    await page.goto(postPath, { waitUntil: 'networkidle' });
  } else {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('.slateframe-card-title a').first().click();
  }
  await expect(page.locator('.slateframe-prose').first()).toBeVisible();
  await page.locator('.slateframe-prose').first().evaluate((root, html) => {
    const region = document.createElement('div');
    region.innerHTML = html;
    root.append(...region.children);
  }, fixture);
  await page.addStyleTag({ path: 'rtl.css' });
}

test('Core footnote backreference is a bounded keyboard target in both directions', async ({ page }, info) => {
  test.skip(![390, 1440].includes(info.project.use.viewport?.width || 1440), 'Each representative project tests all seven widths and both directions');
  await openArticle(page);
  const ref = page.locator('.slateframe-core-footnotes-fixture a[href="#fnref-slateframe-core"]');
  const inline = page.locator('.slateframe-core-footnotes-fixture sup a');
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      const metrics = await ref.evaluate(node => ({
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        display: getComputedStyle(node).display,
        scrollMargin: parseFloat(getComputedStyle(node.closest('li')).scrollMarginBlockStart),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(metrics.display).toBe('inline-grid');
      expect(metrics.width, `${width}px ${dir}`).toBeGreaterThanOrEqual(44);
      expect(metrics.height, `${width}px ${dir}`).toBeGreaterThanOrEqual(44);
      expect(metrics.scrollMargin).toBeGreaterThan(0);
      expect(await page.locator('#fnref-slateframe-core').evaluate(node => parseFloat(getComputedStyle(node).scrollMarginBlockStart))).toBeGreaterThan(0);
      expect(metrics.overflow, `${width}px ${dir}`).toBeLessThanOrEqual(1);
      expect(await inline.evaluate(node => getComputedStyle(node).display)).not.toBe('inline-flex');
    }
  }
});

test('Core footnote navigation and target highlight remain visible at zoom in forced colors', async ({ page }, info) => {
  const width = info.project.use.viewport?.width || 1440;
  test.skip(![390, 1440].includes(width), 'Representative screenshot viewports');
  await openArticle(page);
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const footnote = page.locator('#fn-slateframe-core');
  const link = footnote.locator('a');
  await page.locator('.slateframe-core-footnotes-fixture sup a[href="#fn-slateframe-core"]').click();
  await expect(footnote).toHaveCSS('outline-style', 'solid');
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await footnote.screenshot({ path: `test-artifacts/screenshots/core-footnotes-target-${width}-rtl-200-forced-colors.png` });
  await page.locator('.slateframe-core-footnotes-fixture sup a').focus();
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  expect(await link.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#fnref-slateframe-core$/);
  await expect(page.locator('#fnref-slateframe-core')).toHaveCSS('outline-style', 'solid');
  await expect.poll(() => page.locator('#fnref-slateframe-core').evaluate(node =>
    node.getBoundingClientRect().top
  )).toBeGreaterThanOrEqual(-1);
  await expect.poll(() => page.locator('#fnref-slateframe-core').evaluate(node =>
    node.getBoundingClientRect().top - document.querySelector('.slateframe-site-header').getBoundingClientRect().bottom
  )).toBeGreaterThanOrEqual(-1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).include('.slateframe-core-footnotes-fixture')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.locator('.slateframe-core-footnotes-fixture p').first().screenshot({ path: `test-artifacts/screenshots/core-footnotes-return-${width}-rtl-200-forced-colors.png` });
});


test('Core footnotes in a footer widget retain list markers and usable return targets', async ({ page }, info) => {
  test.skip(![390, 1440].includes(info.project.use.viewport?.width || 1440), 'Representative footer keyboard evidence');
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.slateframe-site-footer').evaluate(footer => {
    const widget = document.createElement('section');
    widget.className = 'slateframe-footer-widget slateframe-footer-core-footnotes';
    widget.innerHTML = '<p>Footer reference <sup id="fnref-footer-core"><a href="#fn-footer-core">1</a></sup></p><ol class="wp-block-footnotes"><li id="fn-footer-core">Footer note <a href="#fnref-footer-core" aria-label="Return to footer reference">↩</a></li></ol>';
    footer.prepend(widget);
  });
  const list = page.locator('.slateframe-footer-core-footnotes ol');
  const link = list.locator('a');
  for (const dir of ['ltr', 'rtl']) {
    await page.evaluate(value => { document.documentElement.dir = value; }, dir);
    expect(await list.evaluate(node => getComputedStyle(node).listStyleType)).not.toBe('none');
    const rect = await link.boundingBox();
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  const source = page.locator('.slateframe-footer-core-footnotes sup a');
  await source.focus();
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await link.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#fnref-footer-core$/);
  await expect(page.locator('#fnref-footer-core')).toHaveCSS('outline-style', 'solid');
  const accessibility = await new AxeBuilder({ page }).include('.slateframe-footer-core-footnotes')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.locator('.slateframe-footer-core-footnotes').screenshot({
    path: `test-artifacts/screenshots/core-footnotes-footer-${info.project.use.viewport?.width || 1440}-rtl-forced-colors.png`,
  });
});


test('Core footnote reference ID on the anchor supports return navigation without altering inline flow', async ({ page }, info) => {
  test.skip(![390, 1440].includes(info.project.use.viewport?.width || 1440), 'Representative mobile and desktop evidence');
  await openArticle(page);
  const sup = page.locator('.slateframe-core-footnotes-fixture sup').first();
  await sup.evaluate(node => {
    const anchor = node.querySelector('a');
    anchor.id = node.id;
    node.removeAttribute('id');
  });
  const source = sup.locator('a');
  expect(await source.evaluate(node => getComputedStyle(node).display)).not.toBe('inline-flex');
  const backreference = page.locator('.slateframe-core-footnotes-fixture a[href="#fnref-slateframe-core"]');
  await backreference.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#fnref-slateframe-core$/);
  await expect(source).toHaveCSS('outline-style', 'solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});


test('native Core Footnotes long return labels reflow at computed 400% in both directions', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const { setRootTextScale } = require('./support/root-text-scale');
  await openArticle(page);
  const returnLink = page.locator('.slateframe-core-footnotes-fixture a[href="#fnref-slateframe-core"]');
  await returnLink.evaluate(node => {
    node.textContent = 'LongFootnoteReturn日本語中文العربيةNoBreak'.repeat(9);
    node.removeAttribute('aria-label'); // The accessible name must contain the visible label.
  });
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      for (const font of [16, 32, 64]) {
        await setRootTextScale(page, font, dir);
        const metrics = await returnLink.evaluate(node => {
          const rect = node.getBoundingClientRect();
          return {
            width: rect.width, height: rect.height, left: rect.left, right: rect.right,
            wrap: getComputedStyle(node).overflowWrap,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        const label = width + 'px ' + dir + ' ' + font + 'px root';
        expect(metrics.wrap, label + ' inherited wrapping').toBe('anywhere');
        expect(metrics.overflow, label + ' document containment').toBeLessThanOrEqual(1);
        expect(metrics.left, label + ' left boundary').toBeGreaterThanOrEqual(-1);
        expect(metrics.right, label + ' right boundary').toBeLessThanOrEqual(width + 1);
        expect(metrics.width, label + ' target width').toBeGreaterThanOrEqual(44);
        expect(metrics.height, label + ' target height').toBeGreaterThanOrEqual(44);
        if (width === 390 && font === 64) {
          await returnLink.focus();
          await expect(returnLink).toBeFocused();
          await returnLink.evaluate(node => node.scrollIntoView({ block: 'start' }));
          await page.screenshot({
            path: 'test-artifacts/screenshots/' + (dir === 'ltr'
              ? 'core-footnotes-long-return-390-ltr-400.png'
              : 'core-footnotes-long-return-390-rtl-400.png'),
            fullPage: false,
          });
        }
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await setRootTextScale(page, 64, 'rtl');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await returnLink.focus();
  await expect(returnLink).toBeFocused();
  const focus = await returnLink.evaluate(node => ({
    style: getComputedStyle(node).outlineStyle,
    width: parseFloat(getComputedStyle(node).outlineWidth),
  }));
  expect(focus.style).not.toBe('none');
  expect(focus.width).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
  await returnLink.evaluate(node => node.scrollIntoView({ block: 'start' }));
  await page.screenshot({
    path: 'test-artifacts/screenshots/core-footnotes-long-return-390-rtl-400-forced-colors.png',
    fullPage: false,
  });
  const a11y = await new AxeBuilder({ page }).include('.slateframe-core-footnotes-fixture')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
  await returnLink.press('Enter');
  await expect(page).toHaveURL(/#fnref-slateframe-core$/);
  await expect(page.locator('#fnref-slateframe-core')).toHaveCSS('outline-style', 'solid');
});


test('native footnote and backreference fragments clear the sticky header at 400% RTL', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real browser fixture covers desktop widths and zoom');
  test.setTimeout(120000);
  await openArticle(page);
  await page.locator('.slateframe-core-footnotes-fixture').evaluate(root => {
    for (const side of ['before', 'after']) {
      const spacer = document.createElement('div');
      spacer.style.height = '1400px';
      spacer.setAttribute('aria-hidden', 'true');
      root[side](spacer);
    }
  });
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  const ref = page.locator('.slateframe-core-footnotes-fixture sup a[href="#fn-slateframe-core"]');
  const back = page.locator('.slateframe-core-footnotes-fixture a[href="#fnref-slateframe-core"]');
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      for (const font of width === 1440 ? [16, 64] : [16]) {
        await page.evaluate(({ direction, size }) => {
          document.documentElement.dir = direction;
          document.documentElement.style.fontSize = size + 'px';
          history.replaceState(null, '', location.pathname);
          scrollTo(0, 0);
        }, { direction: dir, size: font });
        for (const [link, id] of [[ref, 'fn-slateframe-core'], [back, 'fnref-slateframe-core']]) {
          await link.focus();
          await expect(link).toBeFocused();
          await page.keyboard.press('Enter');
          await expect.poll(() => page.evaluate(() => location.hash)).toBe('#' + id);
          const target = page.locator('#' + id);
          const m = await target.evaluate(node => {
            const header = document.querySelector('.slateframe-site-header');
            const h = header.getBoundingClientRect();
            return {
              top: node.getBoundingClientRect().top,
              headerBottom: h.bottom,
              headerHeight: h.height,
              headerPosition: getComputedStyle(header).position,
              offset: parseFloat(getComputedStyle(node).scrollMarginBlockStart),
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px #' + id;
          expect(m.headerPosition, label + ' sticky header').toBe('sticky');
          expect(m.offset, label + ' token offset').toBeGreaterThanOrEqual(m.headerHeight - 1);
          expect(m.top, label + ' target clears header').toBeGreaterThanOrEqual(m.headerBottom - 2);
          expect(m.top, label + ' no bottom clamping').toBeLessThanOrEqual(m.offset + 3);
          expect(m.overflow, label + ' no document overflow').toBeLessThanOrEqual(1);
          if (width === 1440 && dir === 'rtl' && font === 64) {
            await page.screenshot({
              path: 'test-artifacts/screenshots/core-footnotes-sticky-' + id + '-1440-rtl-400.png',
              animations: 'disabled',
            });
          }
        }
      }
    }
  }
});
