const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding:'utf8', timeout:20000 }).trim();

// The block is rendered by WordPress Core; no DOM imitation or search implementation.
test('Core Search button-inside reflows without losing native semantics', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One WordPress page resized to seven widths');
  test.setTimeout(120000);
  const content = '<!-- wp:search {"label":"Search published work","showLabel":false,"buttonText":"Find 日本語 中文 العربية long localized label","buttonPosition":"button-inside"} /-->';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Core Search inside', '--post_content=' + content, '--porcelain');
  try {
    expect(wp('post', 'get', id, '--field=post_content')).toContain('button-inside');
    await page.goto('/?page_id=' + id, { waitUntil:'networkidle' });
    const form = page.locator('.slateframe-prose form.wp-block-search__button-inside');
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute('role','search');
    const input = form.locator('input[type=search]');
    const button = form.locator('button[type=submit]');
    await expect(input).toHaveAccessibleName('Search published work');
    await expect(button).toHaveAccessibleName('Find 日本語 中文 العربية long localized label');
    expect(await form.evaluate(node => new FormData(node).has('s'))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive:true });
    for (const width of [320,375,390,412,640,768,1440,1920]) {
      await page.setViewportSize({ width, height:900 });
      for (const dir of ['ltr','rtl']) {
        for (const font of (width <= 640 ? [16,32,64] : [16,32])) {
          await page.locator('html').evaluate((node, state) => {
            node.dir=state.dir; node.style.fontSize=state.font+'px';
          }, {dir,font});
          const g = await form.evaluate(node => {
            const wrap=node.querySelector('.wp-block-search__inside-wrapper');
            const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height}};
            return { overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
              display:getComputedStyle(wrap).display,form:box(node),wrapper:box(wrap),
              input:box(node.querySelector('input[type=search]')),
              button:box(node.querySelector('button[type=submit]')) };
          });
          const label=width+'px '+dir+' '+font+'px';
          expect(g.overflow,label+' document overflow').toBeLessThanOrEqual(1);
          for (const key of ['wrapper','input','button']) {
            expect(g[key].left,label+' '+key+' left').toBeGreaterThanOrEqual(g.form.left-1);
            expect(g[key].right,label+' '+key+' right').toBeLessThanOrEqual(g.form.right+1);
          }
          for (const key of ['input','button']) {
            expect(g[key].height,label+' '+key+' target').toBeGreaterThanOrEqual(43);
            expect(g[key].width,label+' '+key+' target').toBeGreaterThanOrEqual(43);
          }
          if (width<=640) {
            expect(g.display,label+' stacked layout').toBe('grid');
            // Core button-inside adds a native padded border; fill its content track, not its border box.
            expect(g.button.width,label+' full-width action').toBeGreaterThanOrEqual(g.input.width-2);
            expect(g.button.left,label+' alignment').toBeGreaterThanOrEqual(g.input.left-2);
            expect(g.button.right,label+' alignment').toBeLessThanOrEqual(g.input.right+2);
          }
          if (font===16 && ((width===320 && dir==='rtl') || (width===1440 && dir==='ltr'))) {
            await form.screenshot({path:'test-artifacts/screenshots/core-search-inside-'+width+'-'+dir+'.png'});
          }
          if (width===320 && dir==='rtl' && font===64) {
            await form.screenshot({path:'test-artifacts/screenshots/core-search-inside-320-rtl-400.png'});
          }
        }
      }
    }
    await page.setViewportSize({width:390,height:900});
    await page.locator('html').evaluate(node=>{node.dir='rtl';node.style.fontSize='32px'});
    await input.focus(); await expect(input).toBeFocused();
    await page.keyboard.press('Tab'); await expect(button).toBeFocused();
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
    await button.focus();
    expect(await button.evaluate(node=>node.matches(':focus-visible'))).toBe(true);
    expect(await button.evaluate(node=>parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    const a11y=await new AxeBuilder({page}).include('.wp-block-search__button-inside')
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    await form.screenshot({path:'test-artifacts/screenshots/core-search-inside-390-rtl-200-forced-colors.png'});
  } finally {
    wp('post','delete',id,'--force');
  }
});
