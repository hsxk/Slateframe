const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const fixture = process.env.SLATEFRAME_CLASS_ONLY_GALLERY_PATH;
test.skip(!fixture, 'Real WordPress class-only Gallery fixture is required.');
async function gallery(page) {
  await page.goto(fixture,{waitUntil:'domcontentloaded'});
  const g=page.locator('#main-content .browser-class-only-sequence.slateframe-gallery-sequence');
  await expect(g).toBeVisible();
  await expect(g.locator(':scope > figure.wp-block-image')).toHaveCount(2);
  await expect(g.locator('img')).toHaveCount(2);
  await expect(g.locator('figcaption')).toHaveCount(2);
  for(const img of await g.locator('img').all()){
    await img.scrollIntoViewIfNeeded();
    await expect.poll(()=>img.evaluate(n=>n.complete && n.naturalWidth>0)).toBe(true);
  }
  return g;
}
test('class-only Gallery loads Photography CSS without lightbox',async ({page})=>{
  const g=await gallery(page);
  await expect(page.locator('link#slateframe-photography-css')).toHaveCount(1);
  expect(await g.getAttribute('class')).not.toContain('is-style-slateframe-photo-sequence');
  await expect(g.locator('.wp-lightbox-container')).toHaveCount(0);
});
test('ordinary Core Gallery without class or lightbox does not load Photography CSS',async ({page})=>{
  const plain=process.env.SLATEFRAME_PLAIN_GALLERY_PATH;
  expect(plain, 'Plain Core Gallery negative-control fixture is required when class-only Gallery tests run').toBeTruthy();
  await page.goto(plain,{waitUntil:'domcontentloaded'});
  const g=page.locator('#main-content .wp-block-gallery');
  await expect(g).toBeVisible();
  await expect(g.locator(':scope > figure.wp-block-image')).toHaveCount(1);
  await expect.poll(()=>g.locator('img').first().evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  expect(await g.getAttribute('class')).not.toContain('slateframe-gallery-sequence');
  await expect(g.locator('.wp-lightbox-container')).toHaveCount(0);
  await expect(page.locator('link#slateframe-photography-css')).toHaveCount(0);
});
test('class-only Gallery keeps bounded grid and natural media ratio',async ({page})=>{
  const g=await gallery(page),v=page.viewportSize();
  const m=await g.evaluate(n=>({
    display:getComputedStyle(n).display,
    columns:getComputedStyle(n).gridTemplateColumns.trim().split(/\s+/).length,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    images:[...n.querySelectorAll('img')].map(i=>{const b=i.getBoundingClientRect();return {
      w:b.width,h:b.height,nw:i.naturalWidth,nh:i.naturalHeight,alt:i.alt,
      fit:getComputedStyle(i).objectFit,srcset:i.getAttribute('srcset')||'',
      sizes:i.getAttribute('sizes')||''};})
  }));
  expect(m.display).toBe('grid');expect(m.columns).toBe(v.width<=640?1:2);
  expect(m.overflow).toBeLessThanOrEqual(1);expect(m.images).toHaveLength(2);
  expect(m.images[0].nh).toBeGreaterThan(m.images[0].nw);
  for(const i of m.images){
    expect(i.w).toBeGreaterThan(0);expect(i.h).toBeGreaterThan(0);
    expect(i.alt).not.toBe('');expect(i.fit).toBe('contain');
    expect(i.srcset.split(',').length).toBeGreaterThanOrEqual(2);
    expect(i.sizes).not.toBe('');
    expect(i.h).toBeLessThanOrEqual(Math.min(v.height*0.62,672)+1);
    expect(Math.abs(i.w/i.h-i.nw/i.nh)).toBeLessThan(0.03);
  }
});
test('RTL, CJK and zoomed captions stay contained',async ({page})=>{
  const g=await gallery(page),width=page.viewportSize().width;
  for(const zoom of (width<=390?[200,400]:[200])){
    await page.evaluate(z=>{document.documentElement.dir='rtl';
      document.documentElement.style.fontSize=z+'%';},zoom);
    const captions=await g.locator('figcaption').evaluateAll(ns=>ns.map(n=>{
      const b=n.getBoundingClientRect(),s=getComputedStyle(n);
      return {left:b.left,right:b.right,h:b.height,position:s.position,shadow:s.textShadow,wrap:s.overflowWrap};}));
    expect(captions).toHaveLength(2);
    for(const c of captions){
      expect(c.h).toBeGreaterThan(0);expect(c.left).toBeGreaterThanOrEqual(-1);
      expect(c.right).toBeLessThanOrEqual(width+1);
      expect(c.position).toBe('static');expect(c.shadow).toBe('none');
      expect(c.wrap).toBe('anywhere');
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});
test('forced colors and reduced motion do not break layout',async ({page})=>{
  const width=page.viewportSize().width;
  test.skip(![390,1440].includes(width),'Representative system modes');
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  const g=await gallery(page);
  const m=await g.evaluate(n=>({
    display:getComputedStyle(n).display,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    widths:[...n.querySelectorAll('img')].map(i=>i.getBoundingClientRect().width)
  }));
  expect(m.display).toBe('grid');expect(m.overflow).toBeLessThanOrEqual(1);
  for(const w of m.widths)expect(w).toBeGreaterThan(0);
});
test('class-only Gallery records full WordPress screenshot',async ({page})=>{
  const width=page.viewportSize().width;
  test.skip(![390,1440].includes(width),'Representative viewports');
  await gallery(page);await page.evaluate(()=>scrollTo(0,0));
  const dir=path.resolve('test-artifacts/photography-lightbox');
  await fs.mkdir(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'class-only-sequence-'+width+'.png'),fullPage:true,animations:'disabled'});
});
