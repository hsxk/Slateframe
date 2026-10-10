const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const latin = 'portablepublishingwithoutwordbreaks'.repeat(7);
const cjk = '長い日本語のサイト名と中文标题混排'.repeat(7);
const rtl = 'الواجهةالعربيةالمتواصلةبدونمسافات'.repeat(7);
const viewport = (info) => info.project.use.viewport?.width || 1440;

test('Core footer reflows two- and three-item layouts across languages and text zoom', async ({ page }, info) => {
  for (const withMenu of [false, true]) {
    await page.goto('/', { waitUntil: 'networkidle' });
    const footer = page.locator('.slateframe-site-footer');
    await expect(footer).toBeVisible();
    await footer.evaluate((node, showMenu) => {
      const inner = node.querySelector('.slateframe-footer-inner');
      inner.querySelector('.slateframe-footer-nav')?.remove();
      if (showMenu) {
        const nav = document.createElement('nav');
        nav.className = 'slateframe-footer-nav';
        nav.setAttribute('aria-label', 'Footer navigation');
        nav.innerHTML = '<ul class="slateframe-footer-menu"><li><a href="/">Menu</a></li></ul>';
        inner.querySelector('.slateframe-copyright').before(nav);
      }
    }, withMenu);
    for (const [direction, label] of [['ltr', latin], ['ltr', cjk], ['rtl', rtl]]) {
      await page.locator('html').evaluate((node, value) => { node.dir = value; }, direction);
      await footer.evaluate((node, value) => {
        const brand = node.querySelector('.slateframe-footer-brand');
        brand.querySelector('strong').textContent = value;
        const tagline = brand.querySelector('p');
        if (tagline) tagline.textContent = value;
        node.querySelector('.slateframe-copyright').textContent = '© 2026 ' + value;
        const menu = node.querySelector('.slateframe-footer-menu a');
        if (menu) menu.textContent = value;
      }, label);
      for (const zoom of [100, 200]) {
        await page.locator('html').evaluate((node, value) => { node.style.fontSize = value + '%'; }, zoom);
        const state = await footer.evaluate((node) => {
          const inner = node.querySelector('.slateframe-footer-inner');
          return {
            viewport: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
            items: [...inner.children].map((item) => {
              const rect = item.getBoundingClientRect();
              return { width: rect.width, height: rect.height, scroll: item.scrollWidth };
            }),
          };
        });
        expect(state.items).toHaveLength(withMenu ? 3 : 2);
        expect(state.scroll, 'Footer overflow at ' + viewport(info) + 'px ' + direction + ' ' + zoom + '%').toBeLessThanOrEqual(state.viewport + 1);
        for (const item of state.items) {
          expect(item.width, 'No zero-width phantom footer track').toBeGreaterThan(100);
          expect(item.height).toBeGreaterThan(0);
          expect(item.scroll).toBeLessThanOrEqual(item.width + 1);
        }
        if (withMenu && direction === 'ltr' && zoom === 200 && [320, 390, 768, 1440].includes(viewport(info))) {
          const dir = path.resolve('test-artifacts/screenshots');
          await fs.mkdir(dir, { recursive: true });
          await footer.screenshot({ path: path.join(dir, 'footer-intrinsic-' + info.project.name + '.png'), animations: 'disabled' });
        }
      }
    }
  }
});
