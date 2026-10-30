const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const {execFileSync}=require('node:child_process');
const fs=require('node:fs/promises');
const {setRootTextScale}=require('./support/root-text-scale');
const {openAuthenticatedEditor}=require('./support/editor-login');
const wp=(...args)=>execFileSync('wp',[...args,'--path=/tmp/wp-browser'],{encoding:'utf8',timeout:30000}).trim();
const pattern=slug=>wp('eval',"echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/"+slug+"')['content'];");
const content=()=>pattern('project-case-study')+pattern('learning-path');

test('Core Project and Learning groups retain readable block spacing at 400%',async({page},info)=>{
  test.skip(info.project.use.viewport?.width!==390,'One WordPress fixture covers seven widths');
  test.setTimeout(180000);
  const id=wp('post','create','--post_type=page','--post_status=publish','--post_title=Core feature spacing fixture','--post_content='+content(),'--porcelain');
  try{
    await page.goto('/?page_id='+id,{waitUntil:'networkidle'});
    const groups=page.locator('.slateframe-prose .wp-block-group:is(.is-style-slateframe-project-feature,.is-style-slateframe-learning-path)');
    await expect(groups).toHaveCount(2);
    await fs.mkdir('test-artifacts/screenshots',{recursive:true});
    for(const width of [320,375,390,412,768,1440,1920]){
      await page.setViewportSize({width,height:900});
      for(const dir of ['ltr','rtl'])for(const font of [16,32,64]){
        await setRootTextScale(page,font,dir);
        const state=await groups.evaluateAll(nodes=>({
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          groups:nodes.map(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return{
            top:parseFloat(s.paddingBlockStart),bottom:parseFloat(s.paddingBlockEnd),
            left:r.left,right:r.right,width:r.width,control:parseFloat(s.getPropertyValue('--slateframe-control'))};})
        }));
        const expected=width<=781?Math.min(font*1.5,40):Math.min(Math.max(font*1.75,Math.min(width*.04,font*3.25)),64);
        const label=width+'px '+dir+' '+font+'px';
        expect(state.overflow,label+' overflow').toBeLessThanOrEqual(1);
        for(const g of state.groups){
          expect(g.top,label+' top').toBeCloseTo(expected,1);
          expect(g.bottom,label+' bottom').toBeCloseTo(expected,1);
          expect(g.left,label+' left').toBeGreaterThanOrEqual(-1);
          expect(g.right,label+' right').toBeLessThanOrEqual(width+1);
          expect(g.width,label+' width').toBeGreaterThan(0);
          expect(g.control,label+' 44px floor').toBeGreaterThanOrEqual(44);
          expect(g.control,label+' 56px ceiling').toBeLessThanOrEqual(56);
        }
        if(width===390&&dir==='rtl'&&font===64){
          for(const [i,name] of ['content-feature-project-390-rtl-400.png','content-feature-learning-390-rtl-400.png'].entries()){
            await groups.nth(i).evaluate(node=>node.scrollIntoView({block:'start'}));
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
    await groups.nth(1).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({fullPage:false,path:'test-artifacts/screenshots/content-feature-learning-390-rtl-400-forced-colors.png'});
    await page.emulateMedia({forcedColors:'none'});
    await page.setViewportSize({width:1440,height:900});
    await setRootTextScale(page,16,'ltr');
    await groups.first().evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({fullPage:false,path:'test-artifacts/screenshots/content-feature-project-1440-ltr.png'});
  }finally{wp('post','delete',id,'--force');}
});

test('Core feature groups remain valid in Gutenberg with bounded editor spacing',async({page},info)=>{
  test.skip(info.project.use.viewport?.width!==390,'Authenticated editor fixture');
  test.setTimeout(120000);
  const id=wp('post','create','--post_type=page','--post_status=draft','--post_title=Core feature editor','--post_content='+content(),'--porcelain');
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
    for(const name of ['project-feature','learning-path']){
      const group=canvas.locator('.editor-styles-wrapper .wp-block-group.is-style-slateframe-'+name).first();
      await expect(group).toBeVisible();
      const padding=await group.evaluate(node=>parseFloat(getComputedStyle(node).paddingBlockStart));
      expect(padding).toBeGreaterThan(0);
      expect(padding).toBeLessThanOrEqual(64);
    }
  }finally{wp('post','delete',id,'--force');}
});
