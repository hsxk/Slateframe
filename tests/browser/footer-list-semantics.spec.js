const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const { execFileSync } = require('node:child_process');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();
const viewport = info => info.project.use.viewport?.width || 1440;

test('footer authored lists retain markers while navigation remains unmarked', async ({ page }, testInfo) => {
  test.skip(viewport(testInfo) !== 390);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.slateframe-site-footer').evaluate(footer => {
    const fixture = document.createElement('section');
    fixture.className = 'slateframe-footer-widget slateframe-footer-list-fixture';
    fixture.innerHTML = `
      <h2>Footer publishing fixture</h2>
      <ul class="wp-block-list"><li>First editorial note<ul><li>Nested note</li></ul></li><li>Second editorial note</li></ul>
      <ol class="wp-block-list"><li>Step one</li><li>Step two</li></ol>
      <nav aria-label="Fixture navigation"><ul class="menu"><li><a href="#footer-one">Project index</a><ul class="sub-menu"><li><a href="#footer-sub">Project detail</a></li></ul></li></ul></nav>
      <div class="widget widget_archive"><ul><li><a href="#archive">Archive index</a></li></ul></div>
      <div class="widget widget_categories"><ul><li><a href="#category">Category index</a></li></ul></div>
      <div class="classic-widget-menu"><ul class="menu"><li><a href="#classic">Classic widget menu</a></li></ul></div>
      <nav class="wp-block-navigation" aria-label="Block navigation"><ul class="wp-block-navigation__container"><li><a href="#footer-two">Knowledge index</a><ul class="wp-block-navigation__submenu-container"><li><a href="#footer-sub-two">Knowledge detail</a></li></ul></li></ul></nav>`;
    footer.prepend(fixture);
  });
  const widget = page.locator('.slateframe-footer-list-fixture');
  const renderedCoreList = wp('eval', `echo do_blocks('<!-- wp:list --><ul class="wp-block-list"><li>WordPress Core rendered list</li></ul><!-- /wp:list -->');`);
  expect(renderedCoreList).toContain('wp-block-list');
  await widget.evaluate((node, markup) => node.insertAdjacentHTML('beforeend', markup), renderedCoreList);
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      const listStyles = await widget.locator('ul,ol').evaluateAll(nodes => nodes.map(node => ({
        className: node.className,
        type: getComputedStyle(node).listStyleType,
        direction: getComputedStyle(node).direction,
        isCoreList: Boolean(node.closest('.wp-block-list')),
      })));
      for (const item of listStyles) {
        expect(item.type === 'none', `${width}px ${dir} ${item.className} list marker`).toBe(!item.isCoreList);
        expect(item.direction).toBe(dir);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px ${dir} overflow`).toBeLessThanOrEqual(1);
    }
  }
  const footerInner = page.locator('.slateframe-footer-inner');
  for (const [width, alignment] of [[390, 'start'], [1440, 'end']]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await footerInner.evaluate(node => getComputedStyle(node).alignItems)).toBe(alignment);
    for (const child of await footerInner.locator(':scope > *').all()) {
      expect(await child.evaluate(node => getComputedStyle(node).alignSelf)).toBe('auto');
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
  const links = widget.locator('nav a');
  for (const link of await links.all()) {
    await link.focus();
    await expect(link).toBeFocused();
    const height = await link.evaluate(node => node.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(43);
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await links.first().focus();
  expect(await links.first().evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await widget.screenshot({ path: `test-artifacts/screenshots/footer-list-semantics-390-rtl-200-${testInfo.project.name}.png` });
});
