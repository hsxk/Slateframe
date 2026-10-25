const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { openAuthenticatedEditor } = require('./support/editor-login');
const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8', timeout: 30000 }).trim();

test('native Login/out link and form retain Core behavior and bounded controls', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One disposable WordPress fixture covers seven widths');
  test.setTimeout(150000);
  const slug = 'slateframe-loginout-' + randomUUID().slice(0, 12);
  const content = '<!-- wp:group {"className":"slateframe-loginout-fixture"} -->' +
    '<div class="wp-block-group slateframe-loginout-fixture">' +
    '<!-- wp:loginout /--><!-- wp:loginout {"displayLoginAsForm":true} /-->' +
    '</div><!-- /wp:group -->';
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=' + slug, '--post_content=' + content, '--porcelain');
  try {
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const root = page.locator('.slateframe-loginout-fixture');
    await expect(root).toBeVisible();
    const blocks = root.locator('.wp-block-loginout');
    await expect(blocks).toHaveCount(2);
    const link = blocks.first().locator('a');
    const form = blocks.last().locator('form');
    await expect(link).toBeVisible();
    await expect(form).toBeVisible();
    expect(await link.getAttribute('href')).toContain('wp-login.php');
    expect(await form.getAttribute('action')).toContain('wp-login.php');
    await expect(form.locator('input[type=text]')).toHaveCount(1);
    await expect(form.locator('input[type=password]')).toHaveCount(1);
    await expect(form.locator('input[type=submit]')).toHaveCount(1);
    // Keep Core URLs and labels native, then emulate exceptionally long translated copy.
    // This only changes the disposable browser DOM, never WordPress stored content.
    await link.evaluate(node => { node.textContent = '日本語 中文 العربية ' + 'UnbrokenLoginLabel'.repeat(6); });
    await form.locator('label').first().evaluate(node => {
      node.textContent = '日本語 中文 العربية ' + 'UnbrokenUsernameLabel'.repeat(5);
    });
    await expect.poll(() => page.evaluate(() => Boolean(
      document.getElementById('slateframe-core-loginout-inline-css') ||
      document.getElementById('slateframe-core-loginout-css')
    ))).toBe(true);
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dir of ['ltr', 'rtl']) {
        for (const font of width === 390 ? [16, 32, 64] : [16, 32]) {
          await page.locator('html').evaluate((node, v) => {
            node.dir = v.dir; node.style.fontSize = v.font + 'px';
          }, { dir, font });
          const metrics = await root.evaluate(node => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            controls: [...node.querySelectorAll('a,input:not([type=hidden]),label')].map(el => {
              const r = el.getBoundingClientRect();
              return { type: el.getAttribute('type'), left: r.left, right: r.right, height: r.height };
            }),
          }));
          const label = width + 'px ' + dir + ' ' + font;
          expect(metrics.overflow, label).toBeLessThanOrEqual(1);
          expect(metrics.controls.length).toBeGreaterThanOrEqual(6);
          for (const control of metrics.controls) {
            expect(control.left, label).toBeGreaterThanOrEqual(-1);
            expect(control.right, label).toBeLessThanOrEqual(width + 1);
            if (control.type !== 'checkbox') expect(control.height, label).toBeGreaterThanOrEqual(43);
          }
          if (font === 16 && [320, 390, 1440].includes(width))
            await root.screenshot({ path: 'test-artifacts/screenshots/core-loginout-' + width + '-' + dir + '.png' });
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '32px'; });
    await page.keyboard.press('Tab');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await form.locator('input[type=password]').focus();
    await expect(form.locator('input[type=password]')).toBeFocused();
    const axe = await new AxeBuilder({ page }).include('.slateframe-loginout-fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await link.focus();
    expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await root.screenshot({ path: 'test-artifacts/screenshots/core-loginout-390-rtl-200-forced-colors.png' });
    await page.locator('html').evaluate(node => { node.style.fontSize = '64px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.emulateMedia({ forcedColors: 'none' });
    await page.goto('/?p=999999999', { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.getElementById('slateframe-core-loginout-inline-css') ||
      document.getElementById('slateframe-core-loginout-css'))).toBeNull();
  } finally { wp('post', 'delete', id, '--force'); }
});

test('native Gutenberg Login/out attributes roundtrip without editing post', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || ![390, 1440].includes(info.project.use.viewport.width), 'Authenticated Gutenberg fixture');
  await openAuthenticatedEditor(page, postId);
  const result = await page.evaluate(() => {
    const blocks = window.wp.blocks, editor = window.wp.data.select('core/block-editor');
    const before = blocks.serialize(editor.getBlocks());
    const schema = blocks.getBlockType('core/loginout')?.attributes;
    if (!schema) throw new Error('Core Login/out schema missing');
    const cases = [{ displayLoginAsForm: false, redirectToCurrent: false },
      { displayLoginAsForm: true, redirectToCurrent: true }].map(settings => {
      const attrs = Object.fromEntries(Object.entries(settings).filter(([k]) => k in schema));
      const first = blocks.serialize(blocks.createBlock('core/loginout', attrs));
      const parsed = blocks.parse(first);
      return { first, second: blocks.serialize(parsed), name: parsed[0]?.name,
        valid: parsed[0]?.isValid, count: parsed.length, attrs: parsed[0]?.attributes, expected: attrs };
    });
    return { before, after: blocks.serialize(editor.getBlocks()), cases };
  });
  expect(result.after).toBe(result.before);
  for (const entry of result.cases) {
    expect(entry.count).toBe(1);
    expect(entry.name).toBe('core/loginout');
    expect(entry.valid).toBe(true);
    expect(entry.first).toBe(entry.second);
    for (const [key, value] of Object.entries(entry.expected)) expect(entry.attrs[key]).toBe(value);
  }
});

test('authenticated Core logout URL retains WordPress nonce', async ({ page }, info) => {
  const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
  test.skip(!postId || info.project.use.viewport?.width !== 390, 'Authenticated WordPress fixture');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Slateframe logout fixture', '--post_content=<!-- wp:loginout /-->', '--porcelain');
  try {
    await openAuthenticatedEditor(page, postId);
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    const link = page.locator('.wp-block-loginout a');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toContain('wp-login.php');
    expect(href).toContain('action=logout');
    expect(href).toContain('_wpnonce=');
    await link.focus();
    await expect(link).toBeFocused();
    expect(await link.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(43);
  } finally { wp('post', 'delete', id, '--force'); }
});
