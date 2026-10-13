const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');
const variants=[['native','SLATEFRAME_RASTER_PHOTO_PATH','.browser-native-sequence'],['class-only','SLATEFRAME_CLASS_ONLY_GALLERY_PATH','.browser-class-only-sequence']];
const longCaption=('中文摄影说明 日本語の長いキャプション العربية — A translated caption must remain legible at browser zoom. ').repeat(3);
test.beforeEach(({},info)=>test.skip(info.project.use.viewport?.width!==1440,'Representative viewport only'));
for(const [name,env,selector] of variants){
 test(`${name} caption reflows at 400% zoom in LTR/RTL`,async({page})=>{
  test.skip(!process.env[env],'Real WordPress fixture required');
  await page.setViewportSize({width:360,height:225});
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  for(const dir of ['ltr','rtl']){
   await page.goto(process.env[env],{waitUntil:'domcontentloaded'});
   const figure=page.locator(`#main-content ${selector} > figure.wp-block-image`).first();
   await expect(figure).toBeVisible();
   await expect.poll(()=>figure.locator('img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
   await page.evaluate(d=>document.documentElement.dir=d,dir);
   await figure.locator('figcaption').evaluate((node,s)=>node.textContent=s,longCaption);
   const m=await figure.evaluate(f=>{
    const i=f.querySelector('img').getBoundingClientRect(),c=f.querySelector('figcaption').getBoundingClientRect(),r=f.getBoundingClientRect();
    return {figure:r.width,image:i.width,caption:c.width,height:c.height,centers:Math.abs((i.left+i.right-c.left-c.right)/2),below:c.top>=i.bottom-1,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   expect(m.caption).toBeGreaterThanOrEqual(140);
   expect(m.caption).toBeLessThanOrEqual(260);
   expect(m.height).toBeLessThanOrEqual(450);
   expect(m.figure).toBeLessThanOrEqual(260);
   expect(m.image).toBeGreaterThan(0);
   expect(m.centers).toBeLessThanOrEqual(2);
   expect(m.below).toBe(true);
   expect(m.overflow).toBeLessThanOrEqual(1);
   const dest=path.resolve('test-artifacts/photography-lightbox');
   await fs.mkdir(dest,{recursive:true});
   await page.screenshot({path:path.join(dest,`zoom-caption-${name}-${dir}-360x225.png`),fullPage:true,animations:'disabled'});
  }
 });
}
test('normal mobile keeps caption and image width parity',async({page})=>{
 test.skip(!process.env.SLATEFRAME_RASTER_PHOTO_PATH,'Native fixture required');
 await page.setViewportSize({width:390,height:844});
 await page.goto(process.env.SLATEFRAME_RASTER_PHOTO_PATH,{waitUntil:'domcontentloaded'});
 const figure=page.locator('#main-content .browser-native-sequence > figure.wp-block-image').first();
 await expect(figure).toBeVisible();
 await expect.poll(()=>figure.locator('img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 const m=await figure.evaluate(f=>{const i=f.querySelector('img').getBoundingClientRect(),c=f.querySelector('figcaption').getBoundingClientRect();return {imageWidth:i.width,captionWidth:c.width,difference:Math.abs(i.width-c.width),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}});
 expect(m.imageWidth).toBeGreaterThan(0);
 expect(m.captionWidth).toBeGreaterThan(0);
 expect(m.difference).toBeLessThanOrEqual(2);
 expect(m.overflow).toBeLessThanOrEqual(1);
});