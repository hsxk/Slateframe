const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding:'utf8' }).trim();
const fixture = [
  '<!-- wp:group {"className":"slateframe-social-fixture"} --><div class="wp-block-group slateframe-social-fixture">',
  '<!-- wp:social-links {"iconColor":"accent","iconColorValue":"#1d5f50","className":"is-style-logos-only"} -->',
  '<ul class="wp-block-social-links has-icon-color is-style-logos-only">',
  '<!-- wp:social-link {"url":"https://example.org","service":"wordpress"} /-->',
  '<!-- wp:social-link {"url":"https://example.org","service":"github"} /-->',
  '</ul><!-- /wp:social-links -->',
  '<!-- wp:social-links {"iconBackgroundColor":"accent","iconBackgroundColorValue":"#1d5f50"} -->',
  '<ul class="wp-block-social-links has-icon-background-color">',
  '<!-- wp:social-link {"url":"https://example.org","service":"wordpress"} /-->',
  '<!-- wp:social-link {"url":"https://example.org","service":"github"} /-->',
  '</ul><!-- /wp:social-links --></div><!-- /wp:group -->'
].join('');

test('Core Social Links retain names, SVGs, colors and 44px targets at seven widths', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WP page covers all widths');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe Social Links ' + randomUUID(), '--post_content=' + fixture, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil:'networkidle' });
    const root = page.locator('.slateframe-social-fixture');
    const groups = root.locator('.wp-block-social-links');
    const links = root.locator('.wp-social-link a');
    await expect(groups).toHaveCount(2);
    await expect(links).toHaveCount(4);
    await expect(groups.first()).toHaveClass(/is-style-logos-only/);
    await expect(groups.last()).toHaveClass(/has-icon-background-color/);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('href', 'https://example.org');
      await expect(link).toHaveAccessibleName(/wordpress|github/i);
      await expect(link.locator('svg')).toHaveCount(1);
    }
    for (const width of [320,375,390,412,768,1440,1920]) {
      await page.setViewportSize({ width, height:900 });
      for (const direction of ['ltr','rtl']) {
        await page.locator('html').evaluate((el, dir) => { el.dir=dir; el.style.fontSize='200%'; }, direction);
        const data = await root.evaluate(el => ({
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          wraps:[...el.querySelectorAll('.wp-block-social-links')].map(n=>getComputedStyle(n).flexWrap),
          links:[...el.querySelectorAll('.wp-social-link a')].map(n=>{
            const r=n.getBoundingClientRect(), p=n.closest('.wp-block-social-links').getBoundingClientRect();
            return { left:r.left,right:r.right,width:r.width,height:r.height,parentLeft:p.left,parentRight:p.right };
          })
        }));
        expect(data.overflow, width+' '+direction+' overflow').toBeLessThanOrEqual(1);
        expect(data.wraps).toEqual(['wrap','wrap']);
        for (const a of data.links) {
          expect(a.width).toBeGreaterThanOrEqual(44);
          expect(a.height).toBeGreaterThanOrEqual(44);
          expect(a.left).toBeGreaterThanOrEqual(a.parentLeft-1);
          expect(a.right).toBeLessThanOrEqual(a.parentRight+1);
          expect(a.left).toBeGreaterThanOrEqual(-1);
          expect(a.right).toBeLessThanOrEqual(width+1);
        }
        if ([390,1440].includes(width)) {
          await fs.mkdir('test-artifacts/screenshots',{recursive:true});
          await root.screenshot({path:'test-artifacts/screenshots/core-social-links-'+width+'-'+direction+'.png'});
        }
      }
    }
    await page.setViewportSize({width:390,height:900});
    await page.locator('html').evaluate(el=>{el.dir='rtl';el.style.fontSize='200%';});
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
    await links.first().focus();
    await expect(links.first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(links.nth(1)).toBeFocused();
    await expect.poll(()=>links.nth(1).evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2);
    const axe = await new AxeBuilder({page}).include('.slateframe-social-fixture')
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await root.screenshot({path:'test-artifacts/screenshots/core-social-links-390-rtl-200-forced-colors.png'});
    await page.locator('html').evaluate(el=>{el.style.fontSize='400%';});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
  } finally { wp('post','delete',id,'--force'); }
});

test('Gutenberg Core Social Links and children round-trip without changing editor content', async ({ page }, info) => {
  const postId=process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId||![390,1440].includes(info.project.use.viewport.width),'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page,postId);
  const data=await page.evaluate(()=>{
    const editor=window.wp.data.select('core/block-editor'),blocks=window.wp.blocks;
    const before=blocks.serialize(editor.getBlocks());
    const cases=[
      {className:'is-style-logos-only',iconColor:'accent',iconColorValue:'#1d5f50'},
      {iconBackgroundColor:'accent',iconBackgroundColorValue:'#1d5f50'}
    ].map(attrs=>{
      const block=blocks.createBlock('core/social-links',attrs,[
        blocks.createBlock('core/social-link',{url:'https://example.org',service:'wordpress'}),
        blocks.createBlock('core/social-link',{url:'https://example.org',service:'github'})
      ]);
      const first=blocks.serialize(block),parsed=blocks.parse(first);
      return {first,second:blocks.serialize(parsed),valid:parsed[0]?.isValid,
        name:parsed[0]?.name,count:parsed.length,
        children:parsed[0]?.innerBlocks.map(n=>({name:n.name,valid:n.isValid}))};
    });
    return {before,after:blocks.serialize(editor.getBlocks()),cases};
  });
  expect(data.after).toBe(data.before);
  for (const c of data.cases) {
    expect(c.name).toBe('core/social-links');
    expect(c.count).toBe(1);
    expect(c.valid).toBe(true);
    expect(c.second).toBe(c.first);
    expect(c.children).toEqual([
      {name:'core/social-link',valid:true},{name:'core/social-link',valid:true}
    ]);
    expect(c.first).toContain('https://example.org');
  }
});
