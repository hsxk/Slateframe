const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const { setRootTextScale } = require('./support/root-text-scale');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const scenarios = [
  {
    name: 'related-reading', route: postPath, root: '.slateframe-related',
    links: '.slateframe-related-item a', wrapTarget: '.slateframe-related-title',
    mutate: async root => {
      await root.locator('.slateframe-related-title').evaluateAll(nodes => nodes.forEach((node, i) => {
        node.textContent = '関連記事 中文 العربية 日本語 ' +
          'VeryLongUnbrokenEditorialIdentifier'.repeat(8) + ' ' + i;
      }));
    },
  },
  {
    name: '404-recovery', route: '/slateframe-browser-missing-route/',
    root: '.slateframe-not-found', links: '.slateframe-action-link',
    mutate: async root => {
      await root.locator('.slateframe-action-link').evaluate(node => {
        node.textContent = '返回首页 ホームへ العودة للرئيسية ' +
          'UnbrokenTranslatedRecoveryAction'.repeat(4);
      });
      await root.locator('.slateframe-not-found-lead').evaluate(node => {
        node.textContent = '中文 日本語 العربية ' +
          'LongUnbrokenMissingPageExplanation'.repeat(5);
      });
    },
  },
  {
    name: 'post-navigation', route: postPath,
    root: '.slateframe-post-navigation', links: '.nav-links a',
    mutate: async root => {
      await root.locator('.nav-links a').evaluateAll(nodes => nodes.forEach(link => {
        const title = [...link.querySelectorAll('span')]
          .find(node => !node.classList.contains('slateframe-post-navigation-label'));
        if (!title) throw new Error('Native WordPress post-navigation title missing');
        title.textContent = '前の記事 المقالة التالية ' +
          'UnbrokenPostNavigationTitle'.repeat(7);
      }));
    },
  },
];

test('WordPress related, recovery and post navigation reflow at computed 400% RTL', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers seven widths');
  test.setTimeout(240000);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  for (const scenario of scenarios) {
    await page.goto(scenario.route, { waitUntil: 'networkidle' });
    const root = page.locator(scenario.root);
    await expect(root).toBeVisible();
    const links = root.locator(scenario.links);
    expect(await links.count(), scenario.name).toBeGreaterThan(0);
    for (const link of await links.all()) {
      expect(await link.getAttribute('href')).toMatch(/^https?:\/\//);
    }
    await scenario.mutate(root);
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width <= 412 ? [16, 32, 64] : [16, 32]) {
          await setRootTextScale(page, font, dir);
          const state = await root.evaluate((node, wrapTarget) => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            links: [...node.querySelectorAll('a')].filter(a =>
              a.matches('.slateframe-related-item a, .slateframe-action-link, .nav-links a')).map(link => {
              const r = link.getBoundingClientRect();
              const target = wrapTarget ? link.querySelector(wrapTarget) : link;
              const t = target.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height,
                targetLeft: t.left, targetRight: t.right,
                wrap: getComputedStyle(target).overflowWrap };
            }),
          }), scenario.wrapTarget || null);
          const label = scenario.name + ' ' + width + 'px ' + dir + ' ' + font + 'px';
          expect(state.overflow, label + ' root overflow').toBeLessThanOrEqual(1);
          expect(state.links.length, label + ' links').toBeGreaterThan(0);
          for (const link of state.links) {
            expect(link.left, label + ' left').toBeGreaterThanOrEqual(-1);
            expect(link.right, label + ' right').toBeLessThanOrEqual(width + 1);
            expect(link.targetLeft, label + ' text left').toBeGreaterThanOrEqual(-1);
            expect(link.targetRight, label + ' text right').toBeLessThanOrEqual(width + 1);
            expect(link.width, label + ' touch target width').toBeGreaterThanOrEqual(44);
            expect(link.height, label + ' touch target height').toBeGreaterThanOrEqual(44);
            expect(link.wrap, label + ' long-token wrap').toBe('anywhere');
          }
          if (scenario.name === '404-recovery') {
            expect(await root.locator('.slateframe-not-found-lead').evaluate(node =>
              getComputedStyle(node).overflowWrap)).toBe('anywhere');
          }
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await setRootTextScale(page, 64, dir);
      await links.first().scrollIntoViewIfNeeded();
      await links.first().focus();
      await expect(links.first()).toBeFocused();
      await page.screenshot({
        path: 'test-artifacts/screenshots/' + scenario.name + '-390-' + dir + '-400.png',
        fullPage: false,
      });
    }
    const axe = await new AxeBuilder({ page }).include(scenario.root)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations, scenario.name).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await setRootTextScale(page, 64, 'rtl');
    await links.first().scrollIntoViewIfNeeded();
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    expect(await links.first().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    await page.screenshot({
      path: 'test-artifacts/screenshots/' + scenario.name + '-390-rtl-400-forced-colors.png',
      fullPage: false,
    });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  }
});
