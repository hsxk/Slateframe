const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs/promises');
const path = require('node:path');
const fixture = process.env.SLATEFRAME_RASTER_PHOTO_PATH;
test.skip(!fixture, 'Real WordPress Gallery fixture is required.');
async function gallery(page) {
  await page.goto(fixture, {waitUntil:'networkidle'});
  const g=page.locator('#main-content .browser-native-sequence.is-style-slateframe-photo-sequence');
  await expect(g).toBeVisible();
  await expect(g.locator(':scope > figure.wp-block-image')).toHaveCount(2);
  for(const img of await g.locator('img').all()){
    await img.scrollIntoViewIfNeeded();
    await expect.poll(()=>img.evaluate(n=>n.complete && n.naturalWidth>0)).toBe(true);
  }
  return g;
}
test('serialized Gallery preserves responsive grid, uncropped media and sources', async ({page})=>{
  const g=await gallery(page), width=page.viewportSize().width;
  const m=await g.evaluate(n=>({
    display:getComputedStyle(n).display,
    columns:getComputedStyle(n).gridTemplateColumns.trim().split(/\s+/).length,
    span:getComputedStyle(n.querySelector(':scope > figure')).gridColumnEnd,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    images:[...n.querySelectorAll('img')].map(i=>{const b=i.getBoundingClientRect();return {
      w:b.width,h:b.height,nw:i.naturalWidth,nh:i.naturalHeight,alt:i.alt,
      fit:getComputedStyle(i).objectFit,srcset:i.getAttribute('srcset')||'',
      sizes:i.getAttribute('sizes')||''};})
  }));
  expect(m.display).toBe('grid');
  expect(m.columns).toBe(width<=640?1:2);
  expect(m.span).toBe(width<=640?'auto':'-1');
  expect(m.overflow).toBeLessThanOrEqual(1);
  expect(m.images).toHaveLength(2);
  expect(m.images[0].nh).toBeGreaterThan(m.images[0].nw);
  for(const i of m.images){
    expect(i.w).toBeGreaterThan(0);expect(i.h).toBeGreaterThan(0);
    expect(i.alt).not.toBe('');expect(i.fit).toBe('contain');
    expect(i.srcset.split(',').length).toBeGreaterThanOrEqual(2);
    expect(i.sizes).not.toBe('');
    expect(Math.abs(i.w/i.h-i.nw/i.nh)).toBeLessThan(0.03);
  }
});
test('multilingual captions contain within RTL and zoomed layout',async ({page})=>{
  const g=await gallery(page), width=page.viewportSize().width;
  await page.evaluate(()=>{document.documentElement.dir='rtl';document.documentElement.style.fontSize='200%';});
  const captions=await g.locator('figcaption').evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return {
    left:b.left,right:b.right,position:getComputedStyle(n).position,
    shadow:getComputedStyle(n).textShadow,wrap:getComputedStyle(n).overflowWrap};}));
  expect(captions).toHaveLength(2);
  for(const c of captions){expect(c.left).toBeGreaterThanOrEqual(-1);
    expect(c.right).toBeLessThanOrEqual(width+1);expect(c.position).toBe('static');
    expect(c.shadow).toBe('none');expect(c.wrap).toBe('anywhere');}
});
test('Core Lightbox keyboard focus and 44px target',async ({page})=>{
  const g=await gallery(page);
  const trigger=g.locator('button.wp-lightbox-container, .wp-lightbox-container button').first();
  await trigger.focus();await page.keyboard.press('Enter');
  const dialog=page.locator('[role="dialog"]').last();await expect(dialog).toBeVisible();
  const close=dialog.getByRole('button',{name:/close/i});
  const b=await close.boundingBox();expect(b?.width||0).toBeGreaterThanOrEqual(44);
  expect(b?.height||0).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
test('Gallery WCAG A/AA axe',async ({page})=>{
  await gallery(page);
  const r=await new AxeBuilder({page}).include('.browser-native-sequence')
    .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  expect(r.violations.map(v=>v.id)).toEqual([]);
});
test('full WordPress page screenshots',async ({page})=>{
  const width=page.viewportSize().width;
  test.skip(![320,390,768,1440,1920].includes(width),'Representative viewports');
  await gallery(page);await page.evaluate(()=>scrollTo(0,0));
  const dir=path.resolve('test-artifacts/photography-lightbox');
  await fs.mkdir(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'native-sequence-page-'+width+'.png'),fullPage:true,animations:'disabled'});
});
