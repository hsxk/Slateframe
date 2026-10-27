const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();
const asset = (page, name) => page.locator(`link[href*="/assets/css/${name}.css"]`);

test('disposable shortcode plugin opts into only its required presentation', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'Single real WordPress fixture loops all widths');
  test.setTimeout(120_000);
  const id = randomUUID().slice(0, 8), slug = `slateframe-ci-plugin-${id}`;
  const file = `/tmp/wp-browser/wp-content/mu-plugins/${slug}.php`, ids = [];
  const plugin = `<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
add_shortcode('ci_demo_form',static function(){return '<form class="ci-demo-form"><fieldset><legend>日本語 中文 العربية</legend><label for="ci-name">Name</label><input id="ci-name" type="text" readonly aria-invalid="true"><button type="button">Send — العربية</button></fieldset></form>';});
add_shortcode('ci_demo_photo',static function(){return '<div class="slateframe-photography-sequence"><figure class="wp-block-gallery is-style-slateframe-photo-sequence"><figure class="wp-block-image"><img src="/wp-content/themes/slateframe/assets/images/pattern-placeholder-landscape.svg" alt="Decorative"></figure></figure></div>';});
add_shortcode('ci_demo_portfolio',static function(){return '<div class="slateframe-project-grid"><div class="wp-block-query"><ul class="wp-block-post-template"><li class="wp-block-post"><article class="slateframe-project-card"><h2 class="wp-block-post-title"><a href="#ci-end">مشروع 日本語 中文 longprojectreferencelongprojectreference</a></h2><div class="wp-block-post-excerpt"><p>Portable project.</p></div></article></li></ul></div><p id="ci-end">End</p></div>';});
add_shortcode('ci_demo_portfolio_core',static function(){return '<div class=\"slateframe-project-grid\"><div class=\"wp-block-query\"><ul class=\"wp-block-post-template is-layout-grid\" style=\"display:grid;grid-template-columns:repeat(2,minmax(0,1fr))\"><li class=\"wp-block-post\"><article class=\"slateframe-project-card\"><h2 class=\"wp-block-post-title\"><a href=\"#ci-end\">日本語 中文 العربية Core layout</a></h2></article></li><li class=\"wp-block-post\"><article class=\"slateframe-project-card\"><h2 class=\"wp-block-post-title\"><a href=\"#ci-end\">Long portable project without featured media</a></h2></article></li></ul></div><p id=\"ci-end\">End</p></div>';});
add_filter('slateframe_forms_styles_needed',static function($needed){return $needed || is_page('${slug}-form');});
add_filter('slateframe_form_content_styles_needed',static function($needed){return $needed || is_page('${slug}-form');});
add_filter('slateframe_photography_styles_needed',static function($needed){return is_page('${slug}-native') ? false : ($needed || is_page('${slug}-photo'));});
add_filter('slateframe_content_modes_styles_needed',static function($needed){return $needed || (is_page('${slug}-portfolio') || is_page('${slug}-portfolio-core'));});
add_filter('slateframe_query_loop_styles_needed',static function($needed){return $needed || (is_page('${slug}-portfolio') || is_page('${slug}-portfolio-core'));});
`;
  try {
    fs.mkdirSync('/tmp/wp-browser/wp-content/mu-plugins', { recursive: true });
    fs.writeFileSync(file, plugin, { flag: 'wx' });
    const create = (key, content) => {
      const postId = wp('post', 'create', '--post_type=page', '--post_status=publish', `--post_name=${slug}-${key}`,
        `--post_title=CI plugin ${key}`, '--comment_status=closed', `--post_content=${content}`, '--porcelain');
      ids.push(postId); return postId;
    };
    const pages = { plain:create('plain','<p>Unmarked plugin fixture</p>'), form:create('form','[ci_demo_form]'),
      photo:create('photo','[ci_demo_photo]'), portfolio:create('portfolio','[ci_demo_portfolio]'), portfolioCore:create('portfolio-core','[ci_demo_portfolio_core]'),
      native:create('native','<div class="slateframe-photography-sequence">Native marker</div>') };
    const open = async key => page.goto(`/?page_id=${pages[key]}`, { waitUntil:'networkidle' });
    const styles = async expected => { for (const [name,count] of Object.entries(expected)) await expect(asset(page,name)).toHaveCount(count); };
    await open('plain');
    await styles({ forms:0, 'form-content':0, photography:0, 'content-modes':0, 'query-loop':0, 'portfolio-reflow':0 });
    await open('form');
    await styles({ forms:1, 'form-content':1, photography:0, 'query-loop':0, 'portfolio-reflow':0 });
    const form = page.locator('.ci-demo-form');
    await expect(form.locator('legend')).toContainText('日本語 中文 العربية');
    await expect(form.locator('input')).toHaveAttribute('readonly','');
    await expect(form.locator('input')).toHaveAttribute('aria-invalid','true');
    for (const width of [320,375,390,412,768,1440,1920]) {
      await page.setViewportSize({ width, height:900 });
      for (const direction of ['ltr','rtl']) {
        await page.locator('html').evaluate((n,d)=>{n.dir=d;n.style.fontSize='200%';},direction);
        const result = await form.evaluate(n=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          boxes:[n,n.querySelector('input'),n.querySelector('button')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};})}));
        expect(result.overflow,`${width} ${direction} overflow`).toBeLessThanOrEqual(1);
        for(const box of result.boxes){expect(box.left).toBeGreaterThanOrEqual(-1);expect(box.right).toBeLessThanOrEqual(width+1);}
        expect(result.boxes[1].height).toBeGreaterThanOrEqual(44);
        expect(result.boxes[2].height).toBeGreaterThanOrEqual(44);
      }
      if ([390,1440].includes(width)) {
        await page.locator('html').evaluate(n=>{n.dir='ltr';n.style.fontSize='';});
        fs.mkdirSync('test-artifacts/screenshots',{recursive:true});
        await page.screenshot({path:`test-artifacts/screenshots/plugin-coexistence-form-${width}.png`,fullPage:true});
      }
    }
    await page.setViewportSize({width:390,height:900});
    await page.locator('html').evaluate(n=>{n.dir='rtl';n.style.fontSize='400%';});
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
    await form.locator('button').focus();
    await expect(form.locator('button')).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const axe = await new AxeBuilder({page}).include('.ci-demo-form').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.screenshot({path:'test-artifacts/screenshots/plugin-coexistence-form-390-rtl-400-forced-colors.png',fullPage:true});
    await page.emulateMedia({forcedColors:'none'});
    await page.locator('html').evaluate(n=>{n.dir='ltr';n.style.fontSize='';});
    await open('photo');
    await styles({photography:1,'content-modes':0,'query-loop':0,'portfolio-reflow':0,forms:0});
    const img = page.locator('.slateframe-photography-sequence img');
    await expect(img).toBeVisible();
    await expect.poll(()=>img.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
    await page.screenshot({path:'test-artifacts/screenshots/plugin-coexistence-photo-390.png',fullPage:true});
    await open('portfolio');
    await styles({photography:0,'content-modes':1,'query-loop':1,'portfolio-reflow':1,forms:0});
    const link = page.locator('.slateframe-project-grid .wp-block-post-title a');
    await expect(link).toContainText('日本語 中文');
    await link.focus(); await expect(link).toBeFocused();
    const list = page.locator('.slateframe-project-grid .wp-block-post-template');
    // Plugin-generated lists do not inherit Core's block-support reset. No
    // browser-default bullets or indentation may leak into the project grid.
    for (const width of [320,375,390,412,768,1440,1920]) {
      await page.setViewportSize({width,height:900});
      for (const direction of ['ltr','rtl']) {
        // The plugin owns its shortcode markup; normal-size authored columns
        // must remain unchanged before testing the opt-in 200% reflow.
        await page.locator('html').evaluate((n,d)=>{n.dir=d;n.style.fontSize='100%';},direction);
        const baselineTracks = await list.evaluate(n=>
          getComputedStyle(n).gridTemplateColumns.split(' ').filter(Boolean).length);
        expect(baselineTracks,`${width} ${direction} normal-size columns`).toBe(width<=640?1:width<=900?2:3);
        await page.locator('html').evaluate(n=>{n.style.fontSize='200%';});
        const layout = await list.evaluate(n=>{
          const css=getComputedStyle(n), a=n.querySelector('.wp-block-post-title a');
          const rect=a.getBoundingClientRect();
          return {
            display:css.display, listStyle:css.listStyleType,
            paddingStart:css.paddingInlineStart, marginStart:css.marginInlineStart,
            tracks:css.gridTemplateColumns.split(' ').filter(Boolean).length,
            containerWidth:parseFloat(getComputedStyle(n.closest('.slateframe-project-grid')).width),
            rootFontSize:parseFloat(getComputedStyle(document.documentElement).fontSize),
            overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
            linkLeft:rect.left, linkRight:rect.right, linkHeight:rect.height
          };
        });
        expect(layout.display,`${width} ${direction} display`).toBe('grid');
        expect(layout.listStyle,`${width} ${direction} marker`).toBe('none');
        expect(layout.paddingStart,`${width} ${direction} padding`).toBe('0px');
        expect(layout.marginStart,`${width} ${direction} margin`).toBe('0px');
        // A named 35rem container, not the viewport alone, governs readable
        // columns when users enlarge text. Keep Core's viewport caps otherwise.
        expect(layout.containerWidth).toBeGreaterThan(0);
        expect(layout.rootFontSize).toBeCloseTo(32, 1);
        const expectedTracks = layout.containerWidth <= 35 * layout.rootFontSize
          ? 1 : width<=640?1:width<=900?2:3;
        expect(layout.tracks,`${width} ${direction} 200% container reflow`).toBe(expectedTracks);
        expect(layout.overflow,`${width} ${direction} overflow`).toBeLessThanOrEqual(1);
        expect(layout.linkLeft).toBeGreaterThanOrEqual(-1);
        expect(layout.linkRight).toBeLessThanOrEqual(width+1);
        expect(layout.linkHeight).toBeGreaterThanOrEqual(44);
      }
      if ([390,1440].includes(width)) {
        await page.locator('html').evaluate(n=>{n.dir='rtl';n.style.fontSize='200%';});
        await link.focus();
        await expect(link).toBeFocused();
        await page.screenshot({path:`test-artifacts/screenshots/plugin-coexistence-portfolio-${width}-rtl.png`,fullPage:true});
      }
    }
    await page.setViewportSize({width:390,height:900});
    await page.locator('html').evaluate(n=>{n.dir='rtl';n.style.fontSize='400%';});
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
    await link.focus();
    await expect(link).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:'test-artifacts/screenshots/plugin-coexistence-portfolio-390-rtl-400-forced-colors.png',fullPage:true});
    await page.emulateMedia({forcedColors:'none'});
    await page.locator('html').evaluate(n=>{n.dir='ltr';n.style.fontSize='';});

    // Plugin-generated Core grid: preserve author columns and semantic list.
    await open('portfolioCore');
    await styles({photography:0,'content-modes':1,'query-loop':1,'portfolio-reflow':1,forms:0});
    const coreGrid = page.locator('.slateframe-project-grid .wp-block-post-template.is-layout-grid');
    await expect(coreGrid.locator(':scope > li')).toHaveCount(2);
    for (const width of [320,375,390,412,768,1440,1920]) {
      await page.setViewportSize({width,height:900});
      for (const direction of ['ltr','rtl']) {
        await page.locator('html').evaluate((n,d)=>{n.dir=d;n.style.fontSize='200%';},direction);
        const result = await coreGrid.evaluate(n=>{
          const css=getComputedStyle(n);
          return {
            display:css.display, tracks:css.gridTemplateColumns.split(' ').filter(Boolean).length,
            listStyle:css.listStyleType, marginStart:css.marginInlineStart,
            paddingStart:css.paddingInlineStart,
            items:[...n.children].map(li=>getComputedStyle(li).listStyleType),
            links:[...n.querySelectorAll('.wp-block-post-title a')].map(a=>{
              const r=a.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};
            }),
            overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
          };
        });
        expect(result.display,`${width} ${direction} Core grid display`).toBe('grid');
        expect(result.tracks,`${width} ${direction} Core grid columns`).toBe(2);
        expect(result.listStyle).toBe('none');
        expect(result.marginStart).toBe('0px');
        expect(result.paddingStart).toBe('0px');
        expect(result.items).toEqual(['none','none']);
        expect(result.overflow,`${width} ${direction} Core grid overflow`).toBeLessThanOrEqual(1);
        for(const rect of result.links){
          expect(rect.left).toBeGreaterThanOrEqual(-1);
          expect(rect.right).toBeLessThanOrEqual(width+1);
          expect(rect.height).toBeGreaterThanOrEqual(44);
        }
      }
      if ([390,1440].includes(width)) {
        await page.locator('html').evaluate(n=>{n.dir='rtl';n.style.fontSize='200%';});
        await coreGrid.locator('.wp-block-post-title a').first().focus();
        await expect(coreGrid.locator('.wp-block-post-title a').first()).toBeFocused();
        await page.screenshot({path:`test-artifacts/screenshots/plugin-coexistence-core-grid-${width}-rtl.png`,fullPage:true});
      }
    }
    await page.locator('html').evaluate(n=>{n.dir='ltr';n.style.fontSize='';});
    await open('native');
    await styles({photography:1,'query-loop':0,'portfolio-reflow':0}); // A plugin cannot suppress required native presentation.
  } finally {
    for (const postId of ids) { try { wp('post','delete',postId,'--force'); } catch {} }
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});
