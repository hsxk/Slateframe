const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

const content = '<!-- wp:list {"ordered":true,"className":"is-style-slateframe-steps"} -->' +
  '<ol class="wp-block-list is-style-slateframe-steps">' +
  '<li>Prepare 中文 日本語 العربية — ' + 'unbroken-reference-'.repeat(8) +
  '<p class="nested-explanation">First explanation and a <a href="#check">reference</a>.</p>' +
  '<ul class="nested-checks"><li>Verify input</li><li>Confirm result</li></ul>' +
  '<p class="nested-followup">Continue with the verified result.</p></li>' +
  '<li><p class="block-first">A block-first step.</p><p>Another paragraph.</p>' +
  '<ol class="nested-numbered"><li>Nested native step</li></ol></li></ol><!-- /wp:list -->' +
  '<!-- wp:list {"className":"is-style-slateframe-checklist"} -->' +
  '<ul class="wp-block-list is-style-slateframe-checklist"><li>Check 中文 العربية' +
  '<p>Evidence and result.</p><ul><li>Native nested checkpoint</li></ul></li></ul><!-- /wp:list -->';

async function withFixture(page, run) {
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Nested knowledge steps fixture', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const steps = page.locator('.slateframe-prose ol.is-style-slateframe-steps').first();
    await expect(steps).toBeVisible();
    await expect(steps.locator(':scope > li')).toHaveCount(2);
    await run(steps);
  } finally {
    wp('post', 'delete', id, '--force');
  }
}

test('native Core steps align paragraphs and nested lists at all responsive widths and directions', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One isolated WordPress fixture covers the seven-width matrix');
  await withFixture(page, async steps => {
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((root, value) => { root.dir = value; }, dir);
        const result = await steps.evaluate(root => {
          const first = root.querySelector(':scope > li');
          const second = root.querySelector(':scope > li:nth-child(2)');
          const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right }; };
          return {
            display: getComputedStyle(first).display,
            position: getComputedStyle(first).position,
            markerPosition: getComputedStyle(first, '::before').position,
            markerDirection: getComputedStyle(first, '::before').direction,
            markerInset: getComputedStyle(first, '::before')[getComputedStyle(first).direction === 'rtl' ? 'right' : 'left'],
            first: [box(first.querySelector('.nested-explanation')),
              box(first.querySelector('.nested-checks')), box(first.querySelector('.nested-followup'))],
            second: [box(second.querySelector('.block-first')), box(second.querySelector('.nested-numbered'))],
            nestedBullet: getComputedStyle(first.querySelector('.nested-checks')).listStyleType,
            nestedNumber: getComputedStyle(second.querySelector('.nested-numbered')).listStyleType,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        expect(result.display, width + ' ' + dir).toBe('list-item');
        expect(result.position).toBe('relative');
        expect(result.markerPosition).toBe('absolute');
        expect(result.markerDirection).toBe(dir);
        expect(result.markerInset).toBe('0px');
        expect(result.nestedBullet).not.toBe('none');
        expect(result.nestedNumber).not.toBe('none');
        const edge = r => dir === 'ltr' ? r.left : r.right;
        for (const group of [result.first, result.second]) {
          for (const r of group.slice(1)) {
            expect(Math.abs(edge(group[0]) - edge(r)), width + ' ' + dir).toBeLessThanOrEqual(1);
          }
        }
        expect(result.overflow, width + ' ' + dir).toBeLessThanOrEqual(1);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('html').evaluate(root => { root.dir = 'ltr'; });
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await steps.screenshot({ path: 'test-artifacts/screenshots/knowledge-nested-steps-1440.png' });
  });
});

test('Core step badges and checklist marks survive 200% RTL, forced colors and print', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One isolated WordPress fixture');
  await withFixture(page, async steps => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(root => { root.dir = 'rtl'; root.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const result = await steps.locator(':scope > li').first().evaluate(node => {
      const badge = getComputedStyle(node, '::before');
      return {
        border: badge.borderTopStyle, borderWidth: parseFloat(badge.borderTopWidth),
        direction: badge.direction, right: badge.right, minHeight: parseFloat(getComputedStyle(node).minBlockSize),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(result.border).toBe('solid');
    expect(result.borderWidth).toBeGreaterThanOrEqual(1);
    expect(result.direction).toBe('rtl');
    expect(result.right).toBe('0px');
    expect(result.minHeight).toBeGreaterThanOrEqual(44);
    expect(result.overflow).toBeLessThanOrEqual(1);
    const checklist = page.locator('.slateframe-prose .is-style-slateframe-checklist > li');
    await expect(checklist).toHaveCount(1);
    const marker = await checklist.first().evaluate(node => ({
      content: getComputedStyle(node, '::before').content,
      color: getComputedStyle(node, '::before').color,
      nested: getComputedStyle(node.querySelector('ul')).listStyleType,
    }));
    expect(marker.content).not.toBe('none');
    expect(marker.color).not.toBe('transparent');
    expect(marker.nested).not.toBe('none');
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    await steps.screenshot({ path: 'test-artifacts/screenshots/knowledge-nested-steps-390-rtl-200-forced-colors.png' });
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    await expect(steps.locator(':scope > li')).toHaveCount(2);
    expect(await steps.locator(':scope > li').first().evaluate(node =>
      getComputedStyle(node, '::before').content)).not.toBe('none');
  });
});


test('Core knowledge steps keep a bounded 44px badge gutter at computed 400% zoom', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const { setRootTextScale } = require('./support/root-text-scale');
  const AxeBuilder = require('@axe-core/playwright').default;
  await withFixture(page, async steps => {
    const first = steps.locator(':scope > li').first();
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of [16, 32, 64]) {
          await setRootTextScale(page, font, dir);
          const result = await first.evaluate(node => {
            const li = getComputedStyle(node);
            const badge = getComputedStyle(node, '::before');
            const box = node.getBoundingClientRect();
            const badgeSize = parseFloat(badge.width);
            return {
              badgeWidth: badgeSize, badgeHeight: parseFloat(badge.height),
              badgeFont: parseFloat(badge.fontSize),
              padding: parseFloat(li.paddingInlineStart),
              control: parseFloat(li.getPropertyValue('--slateframe-control')),
              minHeight: parseFloat(li.minBlockSize),
              left: box.left, right: box.right,
              markerInset: li.direction === 'rtl' ? badge.right : badge.left,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              nested: getComputedStyle(node.querySelector('.nested-checks')).listStyleType,
              nestedBox: (() => { const r = node.querySelector('.nested-checks').getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; })(),
              stepsPadding: parseFloat(getComputedStyle(node.parentElement).paddingInlineStart),
              checklistPadding: parseFloat(getComputedStyle(document.querySelector('.slateframe-prose .is-style-slateframe-checklist')).paddingInlineStart),
            };
          });
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(result.overflow, label + ' document overflow').toBeLessThanOrEqual(1);
          expect(result.stepsPadding, label + ' native steps reset').toBeLessThanOrEqual(1);
          expect(result.checklistPadding, label + ' native checklist reset').toBeLessThanOrEqual(1);
          expect(result.left, label + ' list left').toBeGreaterThanOrEqual(-1);
          expect(result.right, label + ' list right').toBeLessThanOrEqual(width + 1);
          expect(result.control, label + ' Appearance control floor').toBeGreaterThanOrEqual(44);
          expect(result.control, label + ' Appearance control ceiling').toBeLessThanOrEqual(56);
          expect(result.badgeWidth, label + ' badge minimum').toBeGreaterThanOrEqual(result.control - 1);
          expect(result.badgeWidth, label + ' badge bounded').toBeLessThanOrEqual(Math.max(44, font * 1.3) + 1);
          expect(result.badgeHeight, label + ' badge square').toBeCloseTo(result.badgeWidth, 0);
          expect(result.minHeight, label + ' reserve badge height').toBeGreaterThanOrEqual(result.badgeHeight - 1);
          expect(result.padding, label + ' badge and text do not overlap')
            .toBeGreaterThanOrEqual(result.badgeWidth + font * .75 - 1);
          expect(result.markerInset, label + ' logical badge start').toBe('0px');
          expect(result.nested, label + ' native nested bullets').not.toBe('none');
          expect(result.badgeFont, label + ' computed counter font').toBeCloseTo(font * .72, 0);
          expect(result.nestedBox.width, label + ' nested list width').toBeGreaterThan(0);
          expect(result.nestedBox.left, label + ' nested list left').toBeGreaterThanOrEqual(-1);
          expect(result.nestedBox.right, label + ' nested list right').toBeLessThanOrEqual(width + 1);
          if (font === 64) {
            expect(result.badgeWidth, label + ' avoid old oversized 2.15rem badge').toBeLessThan(font * 1.4);
          }
          if (width === 390 && font === 64) {
            await first.evaluate(node => node.scrollIntoView({ block: 'start' }));
            await page.screenshot({
              path: 'test-artifacts/screenshots/knowledge-steps-390-' + dir + '-400.png',
              fullPage: false,
            });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await setRootTextScale(page, 64, 'rtl');
    const axe = await new AxeBuilder({ page }).include('.is-style-slateframe-steps')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const forced = await first.evaluate(node => {
      const badge = getComputedStyle(node, '::before');
      return {
        border: badge.borderTopStyle,
        width: parseFloat(badge.width),
        color: badge.color,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(forced.border).toBe('solid');
    expect(forced.width).toBeGreaterThanOrEqual(44);
    expect(forced.color).not.toBe('transparent');
    expect(forced.overflow).toBeLessThanOrEqual(1);
    await first.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({
      path: 'test-artifacts/screenshots/knowledge-steps-390-rtl-400-forced-colors.png',
      fullPage: false,
    });
  });
});
