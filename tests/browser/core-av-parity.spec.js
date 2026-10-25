const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

const caption = '日本語 中文 العربية ' + 'unbroken-caption-token'.repeat(12);
const content =
  '<!-- wp:group {"className":"slateframe-core-av-fixture"} -->' +
  '<div class="wp-block-group slateframe-core-av-fixture">' +
  '<!-- wp:video --><figure class="wp-block-video">' +
  '<video controls preload="none" width="960" height="540"></video>' +
  '<figcaption class="wp-element-caption">' + caption + '</figcaption>' +
  '</figure><!-- /wp:video -->' +
  '<!-- wp:audio --><figure class="wp-block-audio">' +
  '<audio controls preload="none" style="width:960px"></audio>' +
  '<figcaption class="wp-element-caption">' + caption + '</figcaption>' +
  '</figure><!-- /wp:audio -->' +
  '</div><!-- /wp:group -->';

test('native Core Video and Audio keep media, captions and keyboard focus bounded', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One isolated real WordPress post exercises all viewports');
  test.setTimeout(120000);
  const id = wp('post', 'create', '--post_type=post', '--post_status=publish',
    '--post_title=Core audiovisual reflow fixture', '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?p=' + id, { waitUntil: 'networkidle' });
    const fixture = page.locator('.slateframe-core-av-fixture');
    await expect(fixture).toBeVisible();
    const video = fixture.locator('.wp-block-video video');
    const audio = fixture.locator('.wp-block-audio audio');
    await expect(video).toHaveAttribute('controls', '');
    await expect(audio).toHaveAttribute('controls', '');
    await expect(fixture.locator('figcaption')).toHaveCount(2);
    // WordPress may inline registered block assets instead of emitting links.
    // Verify the exact handles and actual rules, not one delivery mechanism.
    await expect.poll(() => page.evaluate(() =>
      ['video', 'audio'].every(block => {
        const handle = 'slateframe-core-' + block;
        const inline = document.getElementById(handle + '-inline-css');
        const external = document.getElementById(handle + '-css');
        return Boolean(
          (inline && inline.textContent.includes('.wp-block-' + block)) ||
          (external && external.sheet)
        );
      })
    )).toBe(true);

    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        await page.locator('html').evaluate((node, value) => {
          node.dir = value;
          node.style.fontSize = '16px';
        }, dir);
        const state = await fixture.evaluate(root => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          figures: [...root.querySelectorAll('figure')].map(figure => {
            const r = figure.getBoundingClientRect();
            const p = figure.parentElement.getBoundingClientRect();
            return { left: r.left, right: r.right, parentLeft: p.left, parentRight: p.right };
          }),
          media: [...root.querySelectorAll('video,audio')].map(node => {
            const r = node.getBoundingClientRect();
            const p = node.parentElement.getBoundingClientRect();
            return { width: r.width, left: r.left, right: r.right,
              parentLeft: p.left, parentRight: p.right, maxInlineSize: getComputedStyle(node).maxInlineSize };
          }),
          captions: [...root.querySelectorAll('figcaption')].map(node => {
            const r = node.getBoundingClientRect();
            const p = node.parentElement.getBoundingClientRect();
            return { left: r.left, right: r.right, parentLeft: p.left, parentRight: p.right,
              wrap: getComputedStyle(node).overflowWrap, align: getComputedStyle(node).textAlign };
          }),
        }));
        const label = width + 'px ' + dir;
        expect(state.overflow, label + ' page overflow').toBeLessThanOrEqual(1);
        expect(state.figures, label).toHaveLength(2);
        expect(state.media, label).toHaveLength(2);
        expect(state.captions, label).toHaveLength(2);
        for (const rect of [...state.figures, ...state.media, ...state.captions]) {
          expect(rect.left, label + ' left').toBeGreaterThanOrEqual(rect.parentLeft - 1);
          expect(rect.right, label + ' right').toBeLessThanOrEqual(rect.parentRight + 1);
        }
        for (const item of state.media) {
          expect(item.width, label + ' media width').toBeGreaterThan(0);
          expect(item.maxInlineSize).toBe('100%');
        }
        for (const item of state.captions) {
          expect(item.wrap).toBe('anywhere');
          expect(item.align).toBe('start');
        }
        if (dir === 'ltr' && [320, 390, 1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots', { recursive: true });
          await fixture.screenshot({ path: 'test-artifacts/screenshots/core-av-' + width + '-ltr.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => {
      node.dir = 'rtl';
      node.style.fontSize = '32px';
    });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.keyboard.press('Tab');
    for (const media of [video, audio]) {
      await media.focus();
      await expect(media).toBeFocused();
      await expect.poll(() => media.evaluate(node =>
        parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    }
    const zoom = await fixture.evaluate(root => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      nodes: [...root.querySelectorAll('video,audio,figcaption')].map(node => {
        const r = node.getBoundingClientRect();
        const p = node.parentElement.getBoundingClientRect();
        return { left: r.left, right: r.right, parentLeft: p.left, parentRight: p.right };
      }),
    }));
    expect(zoom.overflow).toBeLessThanOrEqual(1);
    for (const rect of zoom.nodes) {
      expect(rect.left).toBeGreaterThanOrEqual(rect.parentLeft - 1);
      expect(rect.right).toBeLessThanOrEqual(rect.parentRight + 1);
    }
    const axe = await new AxeBuilder({ page }).include('.slateframe-core-av-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await fixture.screenshot({
      path: 'test-artifacts/screenshots/core-av-390-rtl-200-forced-colors.png',
    });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
