const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const {execFileSync}=require('node:child_process');
const fs=require('node:fs/promises');
const {setRootTextScale}=require('./support/root-text-scale');
const {openAuthenticatedEditor}=require('./support/editor-login');
const wp=(...args)=>execFileSync('wp',[...args,'--path=/tmp/wp-browser'],{encoding:'utf8',timeout:30000}).trim();
const pattern=slug=>wp('eval',"echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/"+slug+"')['content'];");
const content=()=>pattern('project-brief')+pattern('project-case-study');

test('Core Project Brief and Case Study sections retain readable 400% rhythm',async({page},info)=>{
  test.skip(info.project.use.viewport?.width!==390,'One real WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const id=wp('post','create','--post_type=page','--post_status=publish','--post_title=Core Project Brief zoom fixture','--post_content='+content(),'--porcelain');
  try{
    await page.goto('/?page_id='+id,{waitUntil:'networkidle'});
    const brief=page.locator('.slateframe-prose .slateframe-project-brief-pattern .is-style-slateframe-project-brief').first();
    const sections=page.locator('.slateframe-prose .slateframe-project-case-study .slateframe-project-sections').first();
    await expect(brief).toBeVisible();
    await expect(sections).toBeVisible();
    await brief.locator('p').last().evaluate(node=>{node.textContent='日本語 中文 العربية '+ 'UnbrokenProjectIdentifier'.repeat(4);});
    await fs.mkdir('test-artifacts/screenshots',{recursive:true});
    for(const width of [320,375,390,412,768,1440,1920]){
      await page.setViewportSize({width,height:900});
      for(const dir of ['ltr','rtl'])for(const font of [16,32,64]){
        await setRootTextScale(page,font,dir);
        const actual=await page.evaluate(()=>{
          const brief=document.querySelector('.slateframe-prose .slateframe-project-brief-pattern .is-style-slateframe-project-brief');
          const sections=document.querySelector('.slateframe-prose .slateframe-project-case-study .slateframe-project-sections');
          const a=getComputedStyle(brief),b=getComputedStyle(sections);
          const r1=brief.getBoundingClientRect(),r2=sections.getBoundingClientRect();
          return{paddingTop:parseFloat(a.paddingBlockStart),paddingBottom:parseFloat(a.paddingBlockEnd),
            sectionGap:parseFloat(b.marginBlockStart),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
            bounds:[r1,r2].map(r=>({left:r.left,right:r.right,width:r.width})),
            control:parseFloat(a.getPropertyValue('--slateframe-control'))};
        });
        const expectedBrief=width<=781?Math.min(font*1.25,40):Math.min(Math.max(font*1.25,Math.min(width*.03,font*2)),64);
        const expectedSections=width<=781?Math.min(font*1.75,40):Math.min(Math.max(font*1.75,Math.min(width*.04,font*3)),64);
        const label=width+'px '+dir+' '+font+'px';
        expect(actual.paddingTop,label+' brief top').toBeCloseTo(expectedBrief,1);
        expect(actual.paddingBottom,label+' brief bottom').toBeCloseTo(expectedBrief,1);
        expect(actual.sectionGap,label+' sections margin').toBeCloseTo(expectedSections,1);
        expect(actual.overflow,label+' overflow').toBeLessThanOrEqual(1);
        for(const r of actual.bounds){
          expect(r.left,label+' left').toBeGreaterThanOrEqual(-1);
          expect(r.right,label+' right').toBeLessThanOrEqual(width+1);
          expect(r.width,label+' width').toBeGreaterThan(0);
        }
        expect(actual.control,label+' 44px floor').toBeGreaterThanOrEqual(44);
        expect(actual.control,label+' 56px ceiling').toBeLessThanOrEqual(56);
        if(width===390&&dir==='rtl'&&font===64){
          for(const [node,name] of [[brief,'project-brief-390-rtl-400.png'],[sections,'project-sections-390-rtl-400.png']]){
            await node.evaluate(el=>el.scrollIntoView({block:'start'}));
            await page.screenshot({fullPage:false,path:'test-artifacts/screenshots/'+name});
          }
        }
      }
    }
    await page.setViewportSize({width:390,height:900});
    await setRootTextScale(page,64,'rtl');
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
    const axe=await new AxeBuilder({page}).include('.slateframe-prose').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await brief.evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({fullPage:false,path:'test-artifacts/screenshots/project-brief-390-rtl-400-forced-colors.png'});
    await page.emulateMedia({forcedColors:'none'});
    await page.setViewportSize({width:1440,height:900});
    await setRootTextScale(page,16,'ltr');
    await sections.evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({fullPage:false,path:'test-artifacts/screenshots/project-sections-1440-ltr.png'});
  }finally{wp('post','delete',id,'--force');}
});

test('Project Brief and Case Study retain valid Gutenberg Core blocks',async({page},info)=>{
  test.skip(info.project.use.viewport?.width!==390,'Authenticated editor fixture');
  test.setTimeout(120000);
  const id=wp('post','create','--post_type=page','--post_status=draft','--post_title=Core Project Brief editor','--post_content='+content(),'--porcelain');
  try{
    await openAuthenticatedEditor(page,id);
    const state=await page.evaluate(()=>{
      const names=[],invalid=[];
      const visit=blocks=>blocks.forEach(b=>{names.push(b.name);if(b.isValid===false)invalid.push(b.name);visit(b.innerBlocks||[]);});
      visit(window.wp.data.select('core/block-editor').getBlocks());return{names,invalid};
    });
    expect(state.invalid).toEqual([]);
    expect(state.names).not.toContain('core/missing');
    expect(state.names).toContain('core/group');
    expect(state.names).toContain('core/columns');
    const canvas=await page.locator('iframe[name="editor-canvas"]').count()>0?page.frameLocator('iframe[name="editor-canvas"]'):page;
    const brief=canvas.locator('.editor-styles-wrapper .wp-block-group.is-style-slateframe-project-brief').first();
    const sections=canvas.locator('.editor-styles-wrapper .slateframe-project-sections').first();
    await expect(brief).toBeVisible();
    await expect(sections).toBeVisible();
    const padding=await brief.evaluate(node=>parseFloat(getComputedStyle(node).paddingBlockStart));
    const margin=await sections.evaluate(node=>parseFloat(getComputedStyle(node).marginBlockStart));
    expect(padding).toBeGreaterThan(0);
    expect(padding).toBeLessThanOrEqual(64);
    expect(margin).toBeGreaterThan(0);
    expect(margin).toBeLessThanOrEqual(64);
  }finally{wp('post','delete',id,'--force');}
});
