const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

async function dismissEditorWelcomeGuide(page) {
  const guide = page.locator('[role="dialog"]').filter({ hasText: /Welcome to the editor/i }).first();
  try {
    await guide.waitFor({ state: 'visible', timeout: 2_000 });
    const close = guide.getByRole('button', { name: /close/i }).first();
    await expect(close).toBeVisible();
    await close.click();
  } catch (error) {
    // First-use Core onboarding is optional, but must never obscure evidence.
    if (await guide.isVisible().catch(() => false)) throw error;
  }
  await expect(guide).toBeHidden();
}

test('registered Core FAQ stays valid and bounded in Gutenberg', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress fixture covers seven responsive widths');
  const blocks = wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-faq')['content'];");
  expect(blocks.match(/<!-- wp:details/g)).toHaveLength(3);
  const id = wp('post', 'create', '--post_type=page', '--post_status=draft',
    '--post_title=Slateframe native FAQ editor fixture', '--post_content=' + blocks, '--porcelain');
  try {
    await openAuthenticatedEditor(page, id);
    await dismissEditorWelcomeGuide(page);
    const framed = await page.locator('iframe[name="editor-canvas"]').count() > 0;
    const canvas = framed ? page.frameLocator('iframe[name="editor-canvas"]') : page;
    const root = canvas.locator('.editor-styles-wrapper').first();
    const faq = root.locator('.slateframe-knowledge-faq').first();
    await expect(faq).toBeVisible();
    const details = faq.locator('details.wp-block-details');
    await expect(details).toHaveCount(3);
    await expect(details.locator('summary')).toHaveCount(3);
    const parsed = await page.evaluate(() => {
      const names = [], invalid = [];
      const walk = blocks => blocks.forEach(block => {
        names.push(block.name);
        if (block.isValid === false) invalid.push(block.name);
        walk(block.innerBlocks || []);
      });
      walk(window.wp.data.select('core/block-editor').getBlocks());
      return { names, invalid };
    });
    expect(parsed.names.filter(name => name === 'core/details')).toHaveLength(3);
    expect(parsed.names).not.toContain('core/missing');
    expect(parsed.invalid).toEqual([]);

    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const direction of ['ltr', 'rtl']) {
        await root.evaluate((node, dir) => { node.dir = dir; }, direction);
        const metrics = await faq.evaluate(node => {
          const canvas = node.closest('.editor-styles-wrapper');
          const rect = canvas.getBoundingClientRect();
          return {
            direction: getComputedStyle(node).direction,
            left: rect.left, right: rect.right,
            overflow: canvas.scrollWidth - canvas.clientWidth,
            summaries: [...node.querySelectorAll('details > summary')].map(summary => {
              const box = summary.getBoundingClientRect();
              return { left: box.left, right: box.right, height: box.height };
            }),
          };
        });
        expect(metrics.direction, width + ' ' + direction).toBe(direction);
        expect(metrics.overflow, width + ' ' + direction).toBeLessThanOrEqual(1);
        expect(metrics.summaries).toHaveLength(3);
        for (const box of metrics.summaries) {
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.left).toBeGreaterThanOrEqual(metrics.left - 1);
          expect(box.right).toBeLessThanOrEqual(metrics.right + 1);
        }
      }
    }
    // Cover the narrowest Gutenberg editor widths at 200% text zoom.
    for (const width of [320, 375, 412]) {
      await page.setViewportSize({ width, height: 900 });
      await root.evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
      const zoom = await faq.evaluate(node => {
        const canvas = node.closest('.editor-styles-wrapper');
        const bounds = canvas.getBoundingClientRect();
        return {
          overflow: canvas.scrollWidth - canvas.clientWidth,
          left: bounds.left, right: bounds.right,
          summaries: [...node.querySelectorAll('details > summary')].map(summary => {
            const rect = summary.getBoundingClientRect();
            return { left: rect.left, right: rect.right, height: rect.height };
          }),
        };
      });
      expect(zoom.overflow, width + 'px RTL 200%').toBeLessThanOrEqual(1);
      for (const rect of zoom.summaries) {
        expect(rect.left).toBeGreaterThanOrEqual(zoom.left - 1);
        expect(rect.right).toBeLessThanOrEqual(zoom.right + 1);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await root.evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    // Gutenberg can reopen its first-use guide when the responsive canvas or media changes.
    // Dismiss the real Core dialog before asserting the evidence is unobscured.
    await dismissEditorWelcomeGuide(page);
    // Check real visible text fragments, not just the element outer boxes.
    // Closed Core Details have layout-hidden paragraphs: exclude those.
    const zoomBounds = await faq.evaluate(node => {
      const bounds = node.getBoundingClientRect();
      const canvas = node.closest('.editor-styles-wrapper');
      return {
        overflow: canvas.scrollWidth - canvas.clientWidth,
        clipped: [...node.querySelectorAll('h2, p, summary')].flatMap(child => {
          if (!child.getClientRects().length) return [];
          const box = child.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(child);
          const textOutside = [...range.getClientRects()].some(rect =>
            rect.width > 0 && (rect.left < bounds.left - 2 || rect.right > bounds.right + 2));
          return box.left < bounds.left - 1 || box.right > bounds.right + 1 || textOutside
            ? [child.tagName.toLowerCase()] : [];
        }),
      };
    });
    expect(zoomBounds.overflow).toBeLessThanOrEqual(1);
    expect(zoomBounds.clipped).toEqual([]);
    await faq.screenshot({ path: 'test-artifacts/screenshots/gutenberg-knowledge-faq-390-rtl-200-forced-colors.png' });
    // At 200% zoom, the last paragraph may sit below Gutenberg's inner viewport.
    // Preserve separate evidence of its actual text rather than accepting a partial block image.
    const closingParagraph = faq.locator('p').last();
    // The registered PHP pattern is translated by WordPress. An English-only
    // assertion would reject a correct Japanese/Chinese/RTL installation.
    // Compare the editor against the actual localized registered Core pattern.
    const expectedClosingText = await page.evaluate(markup => {
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      return parsed.querySelector('.slateframe-knowledge-faq > p:last-child')?.textContent?.trim() || '';
    }, blocks);
    expect(expectedClosingText).not.toBe('');
    await expect(closingParagraph).toHaveText(expectedClosingText);
    await closingParagraph.scrollIntoViewIfNeeded();
    const closingGeometry = await closingParagraph.evaluate(node => {
      const bounds = node.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
      const outside = rects.some(rect => rect.left < bounds.left - 2 ||
        rect.right > bounds.right + 2 || rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2);
      const clippedByAncestor = [];
      for (let ancestor = node.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const clipsX = /(auto|scroll|hidden|clip)/.test(style.overflowX);
        const clipsY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
        if (!clipsX && !clipsY) continue;
        const box = ancestor.getBoundingClientRect();
        if (rects.some(rect => (clipsX && (rect.left < box.left - 2 || rect.right > box.right + 2)) ||
          (clipsY && (rect.top < box.top - 2 || rect.bottom > box.bottom + 2)))) {
          clippedByAncestor.push(ancestor.className || ancestor.tagName);
        }
      }
      const outsideFrame = rects.some(rect => rect.top < -2 || rect.bottom > window.innerHeight + 2 ||
        rect.left < -2 || rect.right > window.innerWidth + 2);
      return { lines: rects.length, outside, clippedByAncestor, outsideFrame };
    });
    expect(closingGeometry.lines).toBeGreaterThan(1);
    expect(closingGeometry.outside).toBe(false);
    expect(closingGeometry.clippedByAncestor).toEqual([]);
    expect(closingGeometry.outsideFrame).toBe(false);
    await closingParagraph.screenshot({
      path: 'test-artifacts/screenshots/gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png',
    });
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await root.evaluate(node => { node.dir = 'ltr'; node.style.fontSize = ''; });
    await dismissEditorWelcomeGuide(page);
    await faq.screenshot({ path: 'test-artifacts/screenshots/gutenberg-knowledge-faq-1440-ltr.png' });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
