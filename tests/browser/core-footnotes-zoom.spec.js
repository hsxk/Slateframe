const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const {execFileSync}=require('node:child_process');
const fs=require('node:fs/promises');
const {setRootTextScale}=require('./support/root-text-scale');
const {openAuthenticatedEditor}=require('./support/editor-login');
const wp=(...args)=>execFileSync('wp',[...args,'--path=/tmp/wp-browser'],{encoding:'utf8',timeout:30000}).trim();
const content='<!-- wp:paragraph --><p>Native references <sup data-fn="slateframe-note-one" class="fn"><a href="#slateframe-note-one" id="slateframe-note-one-link">1</a></sup> and <sup data-fn="slateframe-note-two" class="fn"><a href="#slateframe-note-two" id="slateframe-note-two-link">2</a></sup>.</p><!-- /wp:paragraph --><!-- wp:footnotes /-->';
const notes=[{id:'slateframe-note-one',content:'日本語 中文 العربية '+'UnbrokenEvidenceIdentifier'.repeat(4)},{id:'slateframe-note-two',content:'Second note with <a href="https://example.org/reference">source link</a>.'}];
const create=status=>{const id=wp('post','create','--post_type=post','--post_status='+status,'--post_title=Native Core Footnotes zoom','--post_content='+content,'--porcelain');wp('post','meta','update',id,'footnotes',JSON.stringify(notes));return id;};

test('Core Footnotes keep native backlinks and bounded RTL/CJK 400% reading width',async({page},info)=>{
 test.skip(info.project.use.viewport?.width!==390,'One WordPress fixture covers seven widths');
 test.setTimeout(180000);
 const id=create('publish');
 try{
  await page.goto('/?p='+id,{waitUntil:'networkidle'});
  const block=page.locator('.slateframe-prose .wp-block-footnotes');
  await expect(block.locator('li')).toHaveCount(2);
  await expect(page.locator('sup[data-fn]')).toHaveCount(2);
  await expect(block.locator('li>a[href$="-link"]')).toHaveCount(2);
  await expect(block.locator('li>a[href$="-link"]').first()).toHaveAttribute('aria-label',/.+/);
  await fs.mkdir('test-artifacts/screenshots',{recursive:true});
  for(const width of [320,375,390,412,768,1440,1920]){
   await page.setViewportSize({width,height:900});
   for(const dir of ['ltr','rtl'])for(const font of [16,32,64]){
    await setRootTextScale(page,font,dir);
    const a=await block.evaluate(n=>{const s=getComputedStyle(n),li=n.querySelector('li'),b=li.querySelector('a[href$="-link"]').getBoundingClientRect(),r=n.getBoundingClientRect();return{pad:parseFloat(s.paddingInlineStart),gap:parseFloat(getComputedStyle(li).marginBlockStart),scroll:parseFloat(getComputedStyle(li).scrollMarginBlockStart),w:b.width,h:b.height,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,left:r.left,right:r.right};});
    const label=width+' '+dir+' '+font;
    expect(a.pad,label+' indent').toBeCloseTo(Math.min(font*.9*1.35,32),1);
    expect(a.gap,label+' gap').toBeCloseTo(Math.min(font*.6,20),1);
    expect(a.w,label+' backlink width').toBeGreaterThanOrEqual(44);
    expect(a.h,label+' backlink height').toBeGreaterThanOrEqual(44);
    expect(a.scroll,label+' anchor offset').toBeGreaterThan(0);
    expect(a.overflow,label+' overflow').toBeLessThanOrEqual(1);
    expect(a.left,label+' left').toBeGreaterThanOrEqual(-1);
    expect(a.right,label+' right').toBeLessThanOrEqual(width+1);
    if(width===390&&dir==='rtl'&&font===64){await block.evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({fullPage:false,path:'test-artifacts/screenshots/core-footnotes-390-rtl-400.png'});}
   }
  }
  await page.setViewportSize({width:390,height:900});
  await setRootTextScale(page,64,'rtl');
  const back=block.locator('li>a[href$="-link"]').first();
  await back.focus();await expect(back).toBeFocused();
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  const axe=await new AxeBuilder({page}).include('.slateframe-prose').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  await block.evaluate(n=>n.scrollIntoView({block:'start'}));
  await page.screenshot({fullPage:false,path:'test-artifacts/screenshots/core-footnotes-390-rtl-400-forced-colors.png'});
  await page.emulateMedia({forcedColors:'none'});
  await page.emulateMedia({media:'print'});
  expect(await back.evaluate(n=>getComputedStyle(n).display)).toBe('inline');
  await page.emulateMedia({media:'screen'});
  await page.setViewportSize({width:1440,height:900});await setRootTextScale(page,16,'ltr');
  await block.evaluate(n=>n.scrollIntoView({block:'start'}));
  await page.screenshot({fullPage:false,path:'test-artifacts/screenshots/core-footnotes-1440-ltr.png'});
 }finally{wp('post','delete',id,'--force');}
});

test('native dynamic Footnotes remain valid Gutenberg blocks',async({page},info)=>{
 test.skip(info.project.use.viewport?.width!==390,'Authenticated editor fixture');
 test.setTimeout(120000);
 const id=create('draft');
 try{
  await openAuthenticatedEditor(page,id);
  const state=await page.evaluate(()=>{const names=[],invalid=[];const visit=bs=>bs.forEach(b=>{names.push(b.name);if(b.isValid===false)invalid.push(b.name);visit(b.innerBlocks||[]);});visit(window.wp.data.select('core/block-editor').getBlocks());return{names,invalid};});
  expect(state.invalid).toEqual([]);expect(state.names).not.toContain('core/missing');expect(state.names).toContain('core/footnotes');
 }finally{wp('post','delete',id,'--force');}
});
