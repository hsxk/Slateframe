const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

test('desktop navigation uses the complete intrinsic box in LTR and RTL', async ({ page }, info) => {
  const width = info.project.use.viewport?.width || 0;
  test.skip(width < 1440, 'Desktop intrinsic width: 1440/1920px only.');
  await page.goto('/', { waitUntil: 'networkidle' });
  const header = page.locator('[data-site-header]');
  const nav = page.locator('[data-primary-nav]');
  await nav.evaluate(node => {
    const inner = node.closest('.slateframe-header-inner');
    inner.style.width = '1100px';
    inner.style.maxWidth = '1100px';
    const brand = inner.querySelector('.slateframe-brand');
    brand.style.width = '290px';
    brand.style.flex = '0 0 auto';
    brand.querySelector('.slateframe-brand-title').textContent = 'Slateframe Publishing';
    node.innerHTML = `<ul>${Array.from({length:6},(_,i)=>
      `<li class="${i===0?'menu-item-has-children':''}"><a href="#nav-${i}">Knowledge${i}</a>${i===0?'<ul class="sub-menu"><li><a href="#deep">A very long nested submenu label that must not affect top-level sizing</a></li></ul>':''}</li>`).join('')}</ul><div class="slateframe-language-slot"><a href="#en">EN</a><a href="#ja">JA</a></div>`;
  });
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate(dir => { document.documentElement.dir = dir; }, direction);
    await expect.poll(() => header.evaluate(node => node.classList.contains('is-compact'))).toBe(false);
    const layout = await page.evaluate(() => {
      const inner = document.querySelector('.slateframe-header-inner');
      const brand = inner.querySelector('.slateframe-brand').getBoundingClientRect();
      const nav = inner.querySelector('[data-primary-nav]').getBoundingClientRect();
      const color = inner.querySelector('.slateframe-color-toggle').getBoundingClientRect();
      const box = inner.getBoundingClientRect();
      const separate = (a,b) => a.right <= b.left+1 || b.right <= a.left+1;
      return {inside:nav.left>=box.left-1 && nav.right<=box.right+1,
        noOverlap:separate(brand,nav) && separate(nav,color),
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    });
    expect(layout.inside,direction).toBe(true);
    expect(layout.noOverlap,direction).toBe(true);
    expect(layout.overflow,direction).toBeLessThanOrEqual(1);
    await nav.locator(':scope > ul > li').first().hover();
    await expect(nav.locator('.sub-menu')).toBeVisible();
  }
  await nav.locator(':scope > ul > li > a').evaluateAll(links =>
    links.forEach(link => { link.textContent='国際写真研究と出版 International Photography Education'; }));
  await expect.poll(() => header.evaluate(node => node.classList.contains('is-compact'))).toBe(true);
  await nav.locator(':scope > ul > li > a').evaluateAll(links =>
    links.forEach((link,index) => { link.textContent=`Knowledge${index}`; }));
  await expect.poll(() => header.evaluate(node => node.classList.contains('is-compact'))).toBe(false);
  await page.evaluate(() => { document.documentElement.style.fontSize='64px'; });
  await expect.poll(() => header.evaluate(node => node.classList.contains('is-compact'))).toBe(true);
  await expect(nav).toHaveAttribute('inert','');
  const menu = page.locator('[data-menu-toggle]');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await expect(nav).not.toHaveAttribute('inert');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded','false');
  await expect(menu).toBeFocused();
  const folder=path.resolve('test-artifacts/screenshots');
  await fs.mkdir(folder,{recursive:true});
  await page.screenshot({path:path.join(folder,`nav-intrinsic-${width}-rtl-400.png`)});
});
