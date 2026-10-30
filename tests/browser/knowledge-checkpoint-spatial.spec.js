const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const { setRootTextScale } = require('./support/root-text-scale');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding:'utf8', timeout:30000 }).trim();
const pattern = () => wp('eval', "echo WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-checklist')['content'];");

test('Core Knowledge checkpoint has bounded padding across 42 responsive/RTL/zoom states', async ({page}, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers all widths');
  test.setTimeout(180000);
  const markup = pattern();
  expect(markup).toContain('<!-- wp:columns');
  const id = wp('post','create','--post_type=page','--post_status=publish',
    '--post_title=Knowledge checkpoint spatial fixture','--post_content='+markup,'--porcelain');
  try {
    await page.goto('/?page_id='+id,{waitUntil:'networkidle'});
    const checkpoint = page.locator('.slateframe-prose .slateframe-knowledge-checklist').first();
    await expect(checkpoint).toBeVisible();
    const columns = checkpoint.locator('.slateframe-learning-checkpoint > .wp-block-column');
    await expect(columns).toHaveCount(2);
    await expect(checkpoint).toContainText('Understand');
    await expect(checkpoint).toContainText('Practise');
    for (const width of [320,375,390,412,768,1440,1920]) {
      await page.setViewportSize({width,height:900});
      for (const dir of ['ltr','rtl']) for (const font of [16,32,64]) {
        await setRootTextScale(page,font,dir);
        const state = await checkpoint.evaluate(node => ({
          root:parseFloat(getComputedStyle(document.documentElement).fontSize),
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          columns:[...node.querySelectorAll('.slateframe-learning-checkpoint > .wp-block-column')].map(el => {
            const s=getComputedStyle(el),r=el.getBoundingClientRect();
            return {top:parseFloat(s.paddingBlockStart),bottom:parseFloat(s.paddingBlockEnd),
              start:parseFloat(s.paddingInlineStart),end:parseFloat(s.paddingInlineEnd),
              left:r.left,right:r.right,width:r.width,
              checks:el.querySelectorAll('.is-style-slateframe-checklist > li').length};
          })
        }));
        const label=width+'px '+dir+' '+font+'px';
        expect(state.root,label+' computed text').toBeCloseTo(font,1);
        expect(state.overflow,label+' document overflow').toBeLessThanOrEqual(1);
        expect(state.columns,label+' Core columns').toHaveLength(2);
        for (const box of state.columns) {
          expect(box.top,label+' block-start').toBeCloseTo(Math.min(font,20),1);
          expect(box.bottom,label+' block-end').toBeCloseTo(Math.min(font,20),1);
          expect(box.start,label+' inline-start').toBeCloseTo(width<=781?0:Math.min(font,20),1);
          expect(box.end,label+' inline-end').toBeCloseTo(width<=781?0:Math.min(font,20),1);
          expect(box.left,label+' left').toBeGreaterThanOrEqual(-1);
          expect(box.right,label+' right').toBeLessThanOrEqual(width+1);
          expect(box.width,label+' positive width').toBeGreaterThan(0);
          expect(box.checks,label+' native list entries').toBe(2);
        }
      }
    }
    await fs.mkdir('test-artifacts/screenshots',{recursive:true});
    await page.setViewportSize({width:390,height:900});
    await setRootTextScale(page,64,'rtl');
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
    const axe=await new AxeBuilder({page}).include('.slateframe-knowledge-checklist')
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await columns.first().scrollIntoViewIfNeeded();
    await columns.first().screenshot({path:'test-artifacts/screenshots/knowledge-checkpoint-390-rtl-400-forced-colors.png',animations:'disabled'});
    await page.setViewportSize({width:1440,height:900});
    await setRootTextScale(page,16,'ltr');
    await page.emulateMedia({forcedColors:'none'});
    await checkpoint.screenshot({path:'test-artifacts/screenshots/knowledge-checkpoint-1440-ltr.png',animations:'disabled'});
  } finally { wp('post','delete',id,'--force'); }
});

test('Knowledge checkpoint roundtrips as valid native Gutenberg blocks',async ({page},info) => {
  test.skip(info.project.use.viewport?.width !== 390,'Authenticated editor fixture');
  test.setTimeout(120000);
  const id=wp('post','create','--post_type=page','--post_status=draft',
    '--post_title=Knowledge checkpoint editor','--post_content='+pattern(),'--porcelain');
  try {
    await openAuthenticatedEditor(page,id);
    const state=await page.evaluate(() => {
      const names=[],invalid=[];
      const visit=blocks=>blocks.forEach(b=>{names.push(b.name);if(b.isValid===false)invalid.push(b.name);visit(b.innerBlocks||[]);});
      visit(window.wp.data.select('core/block-editor').getBlocks());
      return {names,invalid};
    });
    expect(state.invalid).toEqual([]);
    expect(state.names).not.toContain('core/missing');
    expect(state.names).toContain('core/columns');
    expect(state.names.filter(n=>n==='core/column')).toHaveLength(2);
    expect(state.names).toContain('core/list');
    const framed=await page.locator('iframe[name="editor-canvas"]').count()>0;
    const canvas=framed?page.frameLocator('iframe[name="editor-canvas"]'):page;
    await expect(canvas.locator('.editor-styles-wrapper .slateframe-knowledge-checklist')).toBeVisible();
  } finally { wp('post','delete',id,'--force'); }
});
