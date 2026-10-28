const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();
const longLabel = '日本語 中文 العربية ' + 'UnbrokenNavigationLabel'.repeat(4);
const content = '<!-- wp:group {"className":"slateframe-core-navigation-fixture"} -->' +
  '<div class="wp-block-group slateframe-core-navigation-fixture">' +
  '<!-- wp:navigation {"overlayMenu":"never","ariaLabel":"Article sections"} -->' +
  '<!-- wp:navigation-link {"label":"Overview","url":"#navigation-end","kind":"custom"} /-->' +
  '<!-- wp:navigation-link {"label":' + JSON.stringify(longLabel) + ',"url":"#navigation-end","kind":"custom"} /-->' +
  '<!-- wp:navigation-link {"label":"Next / 次へ / التالي","url":"#navigation-end","kind":"custom"} /-->' +
  '<!-- /wp:navigation -->' +
  '<!-- wp:navigation {"overlayMenu":"always","ariaLabel":"Overlay sections"} -->' +
  '<!-- wp:navigation-link {"label":"Overlay link","url":"#navigation-end","kind":"custom"} /-->' +
  '<!-- /wp:navigation -->' +
  '<!-- wp:navigation {"overlayMenu":"mobile","ariaLabel":"Mobile-only sections"} -->' +
  '<!-- wp:navigation-link {"label":"Mobile-only / 日本語 / العربية","url":"#navigation-end","kind":"custom"} /-->' +
  '<!-- /wp:navigation -->' +
  '<p id="navigation-end">End of article sections</p>' +
  '</div><!-- /wp:group -->';

test('native Core Navigation keeps 44px multilingual links within RTL and zoom viewports', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture resized across seven widths');
  test.setTimeout(120000);
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Navigation controls', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-core-navigation-fixture');
    const nav = root.locator('nav.wp-block-navigation').first();
    await expect(nav).toBeVisible();
    const links = nav.locator('a.wp-block-navigation-item__content');
    await expect(links).toHaveCount(3);
    await expect.poll(() => links.first().evaluate(node => getComputedStyle(node).minBlockSize)).toBe('44px');
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, value) => {
            node.dir = value.dir;
            node.style.fontSize = value.font + 'px';
          }, { dir, font });
          const state = await nav.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            offenders: [...document.querySelectorAll('.slateframe-core-navigation-fixture *')]
              .map(el => ({ tag: el.tagName, className: typeof el.className === 'string' ? el.className : '',
                left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }))
              .filter(el => el.left < -1 || el.right > document.documentElement.clientWidth + 1).slice(0, 5),
            viewport: document.documentElement.clientWidth,
            target: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slateframe-control')),
            links: [...node.querySelectorAll('a.wp-block-navigation-item__content')].map(link => {
              const r = link.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                wrap: getComputedStyle(link).overflowWrap };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' document reflow: ' + JSON.stringify(state.offenders)).toBeLessThanOrEqual(1);
          expect(state.target, label + ' bounded token').toBeGreaterThanOrEqual(44);
          expect(state.links).toHaveLength(3);
          for (const link of state.links) {
            expect(link.width, label + ' target width').toBeGreaterThanOrEqual(state.target - 1);
            expect(link.height, label + ' target height').toBeGreaterThanOrEqual(state.target - 1);
            expect(link.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(link.right, label + ' right').toBeLessThanOrEqual(state.viewport + 1);
            expect(link.wrap, label + ' mixed-script wrap').toBe('anywhere');
          }
          if (font === 16 && [320, 390, 1440].includes(width)) {
            await fs.mkdir('test-artifacts/screenshots', { recursive: true });
            await nav.screenshot({ path: 'test-artifacts/screenshots/core-navigation-' + width + '-' + dir + '.png' });
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    const overlay = root.locator('nav.wp-block-navigation').nth(1);
    const open = overlay.locator('button.wp-block-navigation__responsive-container-open');
    await expect(open).toBeVisible();
    const openBox = await open.boundingBox();
    expect(openBox?.width || 0).toBeGreaterThanOrEqual(44);
    expect(openBox?.height || 0).toBeGreaterThanOrEqual(44);
    await open.click();
    const close = overlay.locator('button.wp-block-navigation__responsive-container-close');
    await expect(close).toBeVisible();
    const closeBox = await close.boundingBox();
    expect(closeBox?.width || 0).toBeGreaterThanOrEqual(44);
    const closeMetrics = await close.evaluate(node => ({
      minimum: parseFloat(getComputedStyle(node).minBlockSize),
      rendered: node.getBoundingClientRect().height,
    }));
    // Chromium may report a 44px Core control as 43.999999 CSS pixels.
    // Preserve the 44px minimum and normalize only sub-0.00005px float noise.
    expect(closeMetrics.minimum).toBeGreaterThanOrEqual(44);
    expect(Number(closeMetrics.rendered.toFixed(4))).toBeGreaterThanOrEqual(44);
    const responsive = overlay.locator('.wp-block-navigation__responsive-container');
    await expect(responsive).toHaveClass(/is-menu-open/);
    // Core fades its modal in. Wait until the page underneath is fully obscured.
    await expect.poll(() => responsive.evaluate(node =>
      node.getAnimations().filter(animation => animation.playState === 'running').length
    )).toBe(0);
    const overlaySurface = await responsive.evaluate(node => ({
      background: getComputedStyle(node).backgroundColor,
      opacity: getComputedStyle(node).opacity,
    }));
    expect(overlaySurface.background).not.toBe('transparent');
    expect(overlaySurface.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(overlaySurface.opacity).toBe('1');
    const overlayLink = overlay.locator('.wp-block-navigation__responsive-container-content a').first();
    const overlayBox = await overlayLink.boundingBox();
    expect(overlayBox?.x || 0).toBeGreaterThanOrEqual(-1);
    expect((overlayBox?.x || 0) + (overlayBox?.width || 0)).toBeLessThanOrEqual(391);
    await page.screenshot({ path: 'test-artifacts/screenshots/core-navigation-overlay-390-rtl.png', animations: 'disabled' });
    await close.click();
    const mobileOnly = root.locator('nav.wp-block-navigation').nth(2);
    const mobileOpen = mobileOnly.locator('button.wp-block-navigation__responsive-container-open');
    const mobileLink = mobileOnly.locator('a.wp-block-navigation-item__content');
    for (const width of [768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(mobileOpen, width + 'px Core mobile-only opener must stay hidden').toBeHidden();
      await expect(mobileLink).toBeVisible();
    }
    await mobileOnly.screenshot({ path: 'test-artifacts/screenshots/core-navigation-desktop-no-opener-1920-rtl.png' });
    for (const width of [320, 375, 390, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(mobileOpen, width + 'px Core mobile-only opener').toBeVisible();
      const box = await mobileOpen.boundingBox();
      expect(box?.width || 0).toBeGreaterThanOrEqual(44);
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }
    await mobileOpen.click();
    const mobileClose = mobileOnly.locator('button.wp-block-navigation__responsive-container-close');
    await expect(mobileClose).toBeVisible();
    await expect.poll(() => mobileOnly.locator('.wp-block-navigation__responsive-container').evaluate(node =>
      node.getAnimations().filter(animation => animation.playState === 'running').length
    )).toBe(0);
    await page.screenshot({ path: 'test-artifacts/screenshots/core-navigation-mobile-overlay-412-rtl.png', animations: 'disabled' });
    await mobileClose.click();
    await page.keyboard.press('Tab');
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    const focus = await links.first().evaluate(node => ({
      visible: node.matches(':focus-visible'),
      outline: parseFloat(getComputedStyle(node).outlineWidth),
    }));
    expect(focus.visible).toBe(true);
    expect(focus.outline).toBeGreaterThanOrEqual(3);
    const axe = await new AxeBuilder({ page }).include('.slateframe-core-navigation-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.reload({ waitUntil: 'networkidle' });
    const first = page.locator('.slateframe-core-navigation-fixture a.wp-block-navigation-item__content').first();
    await page.keyboard.press('Tab');
    await first.focus();
    await expect(first).toBeFocused();
    expect(await first.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.locator('.slateframe-core-navigation-fixture nav').first().screenshot({
      path: 'test-artifacts/screenshots/core-navigation-390-rtl-forced-colors.png',
    });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
