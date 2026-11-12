const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

test('Core lightbox controls expose a visible keyboard focus ring', async ({ page }, info) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  // The homepage does not enqueue photography.css; load the real distributable
  // stylesheet for this isolated Core-control fixture, not a test-only mock.
  await page.addStyleTag({ url: '/wp-content/themes/slateframe/assets/css/photography.css' });
  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.className = 'wp-lightbox-overlay active';
    overlay.id = 'slateframe-lightbox-focus-fixture';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;padding:4rem;display:flex;gap:1rem;align-items:flex-start';
    overlay.innerHTML = '<button type="button" class="wp-lightbox-close-button" aria-label="Close">×</button><button type="button" class="wp-lightbox-navigation-button-prev" aria-label="Previous">‹</button><button type="button" class="wp-lightbox-navigation-button-next" aria-label="Next">›</button>';
    document.body.append(overlay);
  });
  const controls = page.locator('#slateframe-lightbox-focus-fixture button');
  await expect(controls).toHaveCount(3);
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const direction of ['ltr', 'rtl']) {
      await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
      await controls.first().focus();
      await expect(controls.first()).toBeFocused();
      const closeMetrics = await controls.first().evaluate(node => {
        const style = getComputedStyle(node);
        const bounds = node.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height, outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth) };
      });
      expect(closeMetrics.width, width + 'px ' + direction + ' close width').toBeGreaterThanOrEqual(44);
      expect(closeMetrics.height, width + 'px ' + direction + ' close height').toBeGreaterThanOrEqual(44);
      expect(closeMetrics.outlineStyle, width + 'px ' + direction + ' close outline').not.toBe('none');
      expect(closeMetrics.outlineWidth, width + 'px ' + direction + ' close outline width').toBeGreaterThanOrEqual(2);
      await page.keyboard.press('Tab');
      for (const index of [1, 2]) {
        const button = controls.nth(index);
        await expect(button).toBeFocused();
        const style = await button.evaluate(node => {
          const computed = getComputedStyle(node);
          return { outlineStyle: computed.outlineStyle, outlineWidth: parseFloat(computed.outlineWidth), outlineColor: computed.outlineColor, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height };
        });
        expect(style.outlineStyle, width + 'px ' + direction + ' focus style').not.toBe('none');
        expect(style.outlineWidth, width + 'px ' + direction + ' focus width').toBeGreaterThanOrEqual(2);
        expect(style.width, width + 'px ' + direction + ' control width').toBeGreaterThanOrEqual(44);
        expect(style.height, width + 'px ' + direction + ' control height').toBeGreaterThanOrEqual(44);
        const bounds = await button.boundingBox();
        expect(bounds, width + 'px ' + direction + ' control bounds').not.toBeNull();
        expect(bounds.x, width + 'px ' + direction + ' left edge').toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width, width + 'px ' + direction + ' right edge').toBeLessThanOrEqual(width);
        expect(bounds.y, width + 'px ' + direction + ' top edge').toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height, width + 'px ' + direction + ' bottom edge').toBeLessThanOrEqual(900);
        if (index === 1) await page.keyboard.press('Tab');
      }
      // Every interactive control, including Close, must remain inside the viewport.
      for (let index = 0; index < 3; index++) {
        const bounds = await controls.nth(index).boundingBox();
        expect(bounds, width + 'px ' + direction + ' control ' + index).not.toBeNull();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
      }
      // Reverse keyboard navigation must restore focus to the previous control.
      await page.keyboard.press('Shift+Tab');
      await expect(controls.nth(1)).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(controls.first()).toBeFocused();
      const closeFocus = await controls.first().evaluate(node => getComputedStyle(node));
      expect(closeFocus.outlineStyle, width + 'px ' + direction + ' close focus').not.toBe('none');
      expect(parseFloat(closeFocus.outlineWidth)).toBeGreaterThanOrEqual(2);
    }
  }
  await page.setViewportSize({ width: info.project.use.viewport?.width || 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  await controls.first().focus();
  await page.keyboard.press('Tab');
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.locator('#slateframe-lightbox-focus-fixture').screenshot({ path: 'test-artifacts/screenshots/lightbox-keyboard-focus.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(controls.nth(1)).toBeFocused();
  const forced = await controls.nth(1).evaluate(node => getComputedStyle(node).outlineStyle);
  expect(forced).not.toBe('none');
  await page.locator('#slateframe-lightbox-focus-fixture').screenshot({ path: 'test-artifacts/screenshots/lightbox-keyboard-focus-forced-colors.png' });
});

test('Core lightbox controls remain operable with reduced motion and forced colors', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.addStyleTag({ url: '/wp-content/themes/slateframe/assets/css/photography.css' });
  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.className = 'wp-lightbox-overlay active';
    overlay.id = 'slateframe-lightbox-accessibility-fixture';
    // Model the Core overlay as a full-viewport surface; the standalone button
    // fixture lacks Core's image-container layout and must not inherit its
    // collapsed, bottom-aligned overlay geometry.
    overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:flex-start';
    overlay.innerHTML = '<button type="button" class="wp-lightbox-close-button" aria-label="Close">×</button><button type="button" class="wp-lightbox-navigation-button-prev" aria-label="Previous">‹</button><button type="button" class="wp-lightbox-navigation-button-next" aria-label="Next">›</button>';
    document.body.append(overlay);
  });
  const close = page.locator('#slateframe-lightbox-accessibility-fixture .wp-lightbox-close-button');
  const buttons = page.locator('#slateframe-lightbox-accessibility-fixture button');
  await expect(buttons).toHaveCount(3);
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    // Wait for Core's dynamic viewport units and fixed overlay to settle after resize.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const direction of ['ltr', 'rtl']) {
      await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
      await close.focus();
      await expect(close).toBeFocused();
      const metrics = await close.evaluate(node => {
        const style = getComputedStyle(node);
        const bounds = node.getBoundingClientRect();
        return {
          x: bounds.x,
          y: bounds.y,
          right: bounds.right,
          bottom: bounds.bottom,
          width: bounds.width,
          height: bounds.height,
          outlineStyle: style.outlineStyle,
          outlineWidth: parseFloat(style.outlineWidth),
          transitionDuration: style.transitionDuration,
          animationDuration: style.animationDuration,
          viewportHeight: document.documentElement.clientHeight,
          innerHeight: window.innerHeight,
          overlayBounds: node.closest('.wp-lightbox-overlay').getBoundingClientRect().toJSON(),
          position: style.position,
        };
      });
      const context = width + 'px ' + direction;
      // Detect a collapsed fixture instead of misreporting its placement as a
      // Core button overflow; real native overlay layout is tested separately.
      expect(metrics.overlayBounds.x, context + ' overlay left').toBe(0);
      expect(metrics.overlayBounds.y, context + ' overlay top').toBe(0);
      expect(metrics.overlayBounds.width, context + ' overlay width').toBe(width);
      expect(metrics.overlayBounds.height, context + ' overlay height').toBe(900);
      expect(metrics.width, context + ' width').toBeGreaterThanOrEqual(44);
      expect(metrics.height, context + ' height').toBeGreaterThanOrEqual(44);
      expect(metrics.x, context + ' left edge').toBeGreaterThanOrEqual(0);
      expect(metrics.y, context + ' top edge').toBeGreaterThanOrEqual(0);
      expect(metrics.right, context + ' right edge').toBeLessThanOrEqual(width);
      expect(metrics.bottom, context + ' bottom edge ' + JSON.stringify(metrics)).toBeLessThanOrEqual(900);
      expect(metrics.outlineStyle, context + ' outline').not.toBe('none');
      expect(metrics.outlineWidth, context + ' outline width').toBeGreaterThanOrEqual(2);
      expect(metrics.transitionDuration.split(',').every(value => parseFloat(value) <= 0.00001), context + ' transition').toBe(true);
      expect(metrics.animationDuration.split(',').every(value => parseFloat(value) <= 0.00001), context + ' animation').toBe(true);
      // All three Core controls, not only Close, must preserve keyboard focus
      // and reduced-motion behavior under forced colors in both directions.
      for (let index = 0; index < 3; index++) {
        const button = buttons.nth(index);
        await button.focus();
        await expect(button).toBeFocused();
        const state = await button.evaluate(node => {
          const computed = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return {
            width: rect.width, height: rect.height,
            x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom,
            outline: computed.outlineStyle,
            outlineWidth: parseFloat(computed.outlineWidth),
            transition: computed.transitionDuration,
            animation: computed.animationDuration,
          };
        });
        const label = context + ' control ' + index;
        expect(state.width, label + ' width').toBeGreaterThanOrEqual(44);
        expect(state.height, label + ' height').toBeGreaterThanOrEqual(44);
        expect(state.x, label + ' left').toBeGreaterThanOrEqual(0);
        expect(state.y, label + ' top').toBeGreaterThanOrEqual(0);
        expect(state.right, label + ' right').toBeLessThanOrEqual(width);
        expect(state.bottom, label + ' bottom').toBeLessThanOrEqual(900);
        expect(state.outline, label + ' focus').not.toBe('none');
        expect(state.outlineWidth, label + ' focus width').toBeGreaterThanOrEqual(2);
        expect(state.transition.split(',').every(value => parseFloat(value) <= 0.00001), label + ' transition').toBe(true);
        expect(state.animation.split(',').every(value => parseFloat(value) <= 0.00001), label + ' animation').toBe(true);
      }
    }
  }
});
