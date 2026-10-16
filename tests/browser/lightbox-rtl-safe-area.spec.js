const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const fixture = process.env.SLATEFRAME_RASTER_PHOTO_PATH;
const evidenceWidths = [320, 390, 768, 1440, 1920];
const width = (info) => Number(info.project.name.replace('viewport-', ''));
test.skip(!fixture, 'Requires real WordPress raster photography fixture.');

async function open(page, direction, gallery = false) {
  await page.goto(fixture, { waitUntil: 'domcontentloaded' });
  await page.evaluate((dir) => { document.documentElement.dir = dir; }, direction);
  const scope = gallery ? '#main-content .browser-raster-gallery' : '#main-content';
  const trigger = page.locator(scope + ' button.wp-lightbox-container, ' + scope + ' .wp-lightbox-container button').first();
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  const dialog = page.locator('[role="dialog"]').last();
  await expect(dialog).toBeVisible();
  return { trigger, dialog, close: dialog.locator('.wp-lightbox-close-button') };
}

async function capture(page, name) {
  await fs.mkdir('test-artifacts/photography-lightbox', { recursive: true });
  await page.screenshot({ path: 'test-artifacts/photography-lightbox/' + name, fullPage: false, animations: 'disabled' });
}

async function verifyClose(page, info, direction) {
  const { trigger, dialog, close } = await open(page, direction);
  await expect(close).toBeVisible();
  const m = await close.evaluate((node) => {
    const r = node.getBoundingClientRect(), style = getComputedStyle(node);
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:var(--slateframe-space-4);margin-top:var(--slateframe-component-gap)';
    document.body.append(probe);
    const offset = parseFloat(getComputedStyle(probe).left);
    const gap = parseFloat(getComputedStyle(probe).marginTop);
    probe.remove();
    return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height,
      direction:style.direction, margin:parseFloat(style.marginBlockStart), offset, gap,
      vw:document.documentElement.clientWidth, vh:document.documentElement.clientHeight,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth };
  });
  expect(m.direction).toBe(direction);
  expect(m.width).toBeGreaterThanOrEqual(44);
  expect(m.height).toBeGreaterThanOrEqual(44);
  expect(m.left).toBeGreaterThanOrEqual(-1);
  expect(m.right).toBeLessThanOrEqual(m.vw + 1);
  expect(m.top).toBeGreaterThanOrEqual(-1);
  expect(m.bottom).toBeLessThanOrEqual(m.vh + 1);
  expect(m.overflow).toBeLessThanOrEqual(1);
  expect(Math.abs(m.margin - m.gap)).toBeLessThanOrEqual(1);
  if (direction === 'rtl') {
    expect(m.left).toBeLessThan(m.vw - m.right);
    expect(m.left).toBeGreaterThanOrEqual(m.offset - 1);
    if (evidenceWidths.includes(width(info))) await capture(page, 'lightbox-rtl-close-viewport-' + width(info) + '.png');
  } else {
    expect(m.vw - m.right).toBeLessThan(m.left);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
}

test('native Core lightbox close control follows RTL inline-end safe area and restores focus', async ({page}, info) => {
  await verifyClose(page, info, 'rtl');
});

test('native Core lightbox close control retains LTR right-edge placement', async ({page}, info) => {
  await verifyClose(page, info, 'ltr');
});

test('native Core gallery navigation respects mobile bottom safe area and desktop Core placement', async ({page}, info) => {
  for (const direction of ['ltr', 'rtl']) {
    // Standalone images have no navigation: select the two-image Core Gallery.
    const { trigger, dialog } = await open(page, direction, true);
    const navigation = dialog.locator('.wp-lightbox-navigation-button:visible');
    await expect(navigation).toHaveCount(2);
    for (const button of await navigation.all()) {
      const m = await button.evaluate((node) => {
        const r = node.getBoundingClientRect(), style = getComputedStyle(node);
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;bottom:var(--slateframe-space-4)';
        document.body.append(probe);
        const gap = parseFloat(getComputedStyle(probe).bottom);
        probe.remove();
        return { left:r.left, right:r.right, width:r.width, height:r.height,
          bottomGap:document.documentElement.clientHeight-r.bottom,
          bottom:parseFloat(style.bottom), transform:style.transform, gap,
          vw:document.documentElement.clientWidth, vh:document.documentElement.clientHeight };
      });
      expect(m.width).toBeGreaterThanOrEqual(44);
      expect(m.height).toBeGreaterThanOrEqual(44);
      expect(m.left).toBeGreaterThanOrEqual(-1);
      expect(m.right).toBeLessThanOrEqual(m.vw + 1);
      if (width(info) < 960) {
        expect(Math.abs(m.bottomGap - m.gap)).toBeLessThanOrEqual(2);
      } else {
        expect(Math.abs(m.bottom - m.vh / 2)).toBeLessThanOrEqual(2);
        expect(m.transform).not.toBe('none');
      }
    }
    if (evidenceWidths.includes(width(info))) await capture(page, 'lightbox-navigation-' + direction + '-viewport-' + width(info) + '.png');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('native Core navigation preserves its 959px/960px breakpoint', async ({page}, info) => {
  test.skip(width(info) !== 390, 'Boundary evidence is collected in the 390px project.');
  const { dialog } = await open(page, 'rtl', true);
  const button = dialog.locator('.wp-lightbox-navigation-button:visible').first();
  await expect(button).toBeVisible();
  for (const w of [959, 960]) {
    await page.setViewportSize({ width:w, height:800 });
    const m = await button.evaluate((node) => ({
      bottom:parseFloat(getComputedStyle(node).bottom),
      transform:getComputedStyle(node).transform,
      height:document.documentElement.clientHeight
    }));
    if (w === 959) {
      expect(m.bottom).toBeGreaterThan(0);
      expect(m.bottom).toBeLessThan(m.height / 4);
    } else {
      expect(Math.abs(m.bottom - m.height / 2)).toBeLessThanOrEqual(2);
      expect(m.transform).not.toBe('none');
    }
    await capture(page, 'lightbox-navigation-breakpoint-' + w + '.png');
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
