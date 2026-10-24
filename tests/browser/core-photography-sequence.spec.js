const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding:'utf8' }).trim();
const pattern = "WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/photography-sequence')";
function publish() {
  const title = 'Slateframe native sequence ' + randomUUID();
  const code = "$p=" + pattern + "; if (!$p || empty($p['content'])) { throw new RuntimeException('Missing pattern'); } $id=wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'" + title + "','post_content'=>$p['content']),true); if (is_wp_error($id)) { throw new RuntimeException($id->get_error_message()); } echo $id;";
  return wp('eval', code);
}
test('registered Photography sequence displays three local uncropped Core images at seven widths', async ({page}, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One real WordPress fixture covers all widths');
  const id = publish();
  try {
    await page.goto('/?page_id=' + id, {waitUntil:'networkidle'});
    const root = page.locator('.slateframe-photography-sequence');
    await expect(root).toBeVisible();
    const gallery = root.locator('.wp-block-gallery');
    const images = gallery.locator('.wp-block-image img');
    await expect(images).toHaveCount(3);
    await expect(gallery).toHaveClass(/is-style-slateframe-photo-sequence/);
    for (const [i,name] of ['landscape','portrait','square'].entries()) {
      await expect(images.nth(i)).toHaveAttribute('src',new RegExp('pattern-placeholder-'+name+'\\.svg'));
      await expect(images.nth(i)).toHaveAttribute('alt','');
      await expect.poll(()=>images.nth(i).evaluate(n=>n.complete && n.naturalWidth>0 && n.naturalHeight>0)).toBe(true);
    }
    for (const width of [320,375,390,412,768,1440,1920]) {
      await page.setViewportSize({width,height:900});
      for (const dir of ['ltr','rtl']) {
        await page.locator('html').evaluate((n,d)=>{n.dir=d;n.style.fontSize='200%';},dir);
        const m = await root.evaluate(n=>({
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          images:[...n.querySelectorAll('.wp-block-image img')].map(i=>{
            const b=i.getBoundingClientRect(),p=i.closest('.wp-block-image').getBoundingClientRect();
            return {left:b.left,right:b.right,width:b.width,height:b.height,parentLeft:p.left,parentRight:p.right,
              ratio:i.naturalWidth/i.naturalHeight,fit:getComputedStyle(i).objectFit};
          })
        }));
        expect(m.overflow,width+' '+dir+' page overflow').toBeLessThanOrEqual(1);
        for (const i of m.images) {
          expect(i.width).toBeGreaterThan(0);
          expect(i.left).toBeGreaterThanOrEqual(i.parentLeft-1);
          expect(i.right).toBeLessThanOrEqual(i.parentRight+1);
          expect(i.left).toBeGreaterThanOrEqual(-1);
          expect(i.right).toBeLessThanOrEqual(width+1);
          expect(Math.abs(i.width/i.height-i.ratio)).toBeLessThan(0.03);
          expect(i.fit).toBe('contain');
        }
        if ([390,1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots',{recursive:true});
          await root.screenshot({path:'test-artifacts/screenshots/core-photography-sequence-'+width+'-'+dir+'.png'});
        }
      }
    }
    // User-authored multilingual captions must reflow without changing the stored Core pattern.
    await root.evaluate(n=>{
      const caption=document.createElement('figcaption');
      caption.textContent='日本語 中文 العربية ' + 'LongUnbrokenCaption'.repeat(5);
      n.querySelector('figure.wp-block-image').append(caption);
    });
    await page.setViewportSize({width:390,height:900});
    await page.locator('html').evaluate(n=>{n.dir='rtl';n.style.fontSize='400%';});
    const caption=await root.locator('figcaption').first().evaluate(n=>{
      const r=n.getBoundingClientRect(),s=getComputedStyle(n);
      return {left:r.left,right:r.right,position:s.position,wrap:s.overflowWrap};
    });
    expect(caption.position).toBe('static');
    expect(caption.wrap).toBe('anywhere');
    expect(caption.left).toBeGreaterThanOrEqual(-1);
    expect(caption.right).toBeLessThanOrEqual(391);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.locator('html').evaluate(n=>{n.style.fontSize='200%';});
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
    const axe=await new AxeBuilder({page}).include('.slateframe-photography-sequence')
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await root.screenshot({path:'test-artifacts/screenshots/core-photography-sequence-390-rtl-200-forced-colors.png'});
  } finally { wp('post','delete',id,'--force'); }
});
test('registered Photography sequence preserves native Gutenberg structure and serialization',async ({page},info)=>{
  const postId=process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390,1440].includes(info.project.use.viewport.width),'Authenticated Gutenberg fixture');
  const encoded=wp('eval',"$p="+pattern+"; if (!$p) { throw new RuntimeException('Missing pattern'); } echo base64_encode($p['content']);");
  const content=Buffer.from(encoded,'base64').toString('utf8');
  await openAuthenticatedEditor(page,postId);
  const data=await page.evaluate(markup=>{
    const editor=window.wp.data.select('core/block-editor'),blocks=window.wp.blocks;
    const before=blocks.serialize(editor.getBlocks()),parsed=blocks.parse(markup);
    const group=parsed[0],gallery=group?.innerBlocks.find(b=>b.name==='core/gallery');
    const first=blocks.serialize(parsed),second=blocks.serialize(blocks.parse(first));
    return {before,after:blocks.serialize(editor.getBlocks()),group:group?.name,gallery:gallery?.name,
      valid:!!gallery && [group,...group.innerBlocks,...gallery.innerBlocks].every(b=>b.isValid),
      names:gallery?.innerBlocks.map(b=>b.name),lightboxes:gallery?.innerBlocks.map(b=>b.attributes.lightbox?.enabled),
      stable:first===second,first};
  },content);
  expect(data.after).toBe(data.before);
  expect(data.group).toBe('core/group');
  expect(data.gallery).toBe('core/gallery');
  expect(data.valid).toBe(true);
  expect(data.names).toEqual(['core/image','core/image','core/image']);
  expect(data.lightboxes).toEqual([true,true,true]);
  expect(data.stable).toBe(true);
  expect(data.first).toContain('pattern-placeholder-landscape.svg');
});
