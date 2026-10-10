const {test,expect}=require('@playwright/test');
const postPath=process.env.SLATEFRAME_POST_PATH||'/';
const width=(info)=>info.project.use.viewport?.width||1440;
async function measure(page) {
 return page.locator('.slateframe-entry-meta').evaluate(meta=>{
  const date=meta.querySelector('.slateframe-published');
  const sep=meta.querySelector('.slateframe-meta-separator');
  const author=meta.querySelector('.slateframe-byline a');
  if(!date||!sep||!author)return null;
  const box=el=>{const rect=el.getBoundingClientRect();return {center:rect.top+rect.height/2,height:rect.height,lineHeight:parseFloat(getComputedStyle(el).lineHeight)}};
  return {date:box(date),sep:box(sep),author:box(author),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
 });
}
for(const dir of ['ltr','rtl']){
 test(`date/author metadata maintains natural line boxes (${dir})`,async({page},info)=>{
  await page.goto(postPath,{waitUntil:'networkidle'});
  await page.evaluate(d=>{document.documentElement.dir=d},dir);
  const m=await measure(page);
  expect(m,'post fixture must have date and author').not.toBeNull();
  expect(m.date.height).toBeLessThanOrEqual(m.date.lineHeight+2);
  expect(m.sep.height).toBeLessThanOrEqual(m.sep.lineHeight+2);
  expect(m.author.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(m.sep.center-m.author.center)).toBeLessThanOrEqual(2);
  // Date is allowed to wrap to another row; compare centers only on the same row.
  if(Math.abs(m.date.center-m.author.center)<m.author.height/2)expect(Math.abs(m.date.center-m.author.center)).toBeLessThanOrEqual(2);
  expect(m.overflow).toBeLessThanOrEqual(1);
  if([390,1440].includes(width(info))){
   await info.attach(`metadata-${dir}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  }
 });
}
test('200% text sizing keeps separator aligned with author',async({page},info)=>{
 test.skip(![390,1440].includes(width(info)));
 await page.goto(postPath,{waitUntil:'networkidle'});
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
 const m=await measure(page);
 expect(m).not.toBeNull();
 expect(m.date.height).toBeLessThanOrEqual(m.date.lineHeight+2);
 expect(m.sep.height).toBeLessThanOrEqual(m.sep.lineHeight+2);
 expect(Math.abs(m.sep.center-m.author.center)).toBeLessThanOrEqual(2);
 expect(m.overflow).toBeLessThanOrEqual(1);
});
