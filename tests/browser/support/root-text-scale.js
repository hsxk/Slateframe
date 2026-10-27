/** Verify that WordPress/Chromium really applied the requested root text scale. */
const { expect } = require('@playwright/test');

async function setRootTextScale(page, pixels, direction) {
  if (![16, 32, 64].includes(pixels) || !['ltr', 'rtl'].includes(direction)) {
    throw new Error('Unsupported text-scale acceptance fixture');
  }
  await page.evaluate(async ({ pixels, direction }) => {
    const root = document.documentElement;
    root.dir = direction;
    root.style.setProperty('font-size', pixels + 'px', 'important');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, { pixels, direction });
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    return {
      inline: root.style.getPropertyValue('font-size'),
      priority: root.style.getPropertyPriority('font-size'),
      computed: Number.parseFloat(getComputedStyle(root).fontSize),
      direction: getComputedStyle(root).direction,
    };
  }), { timeout: 5000 }).toEqual({
    inline: pixels + 'px',
    priority: 'important',
    computed: pixels,
    direction,
  });
}

module.exports = { setRootTextScale };
