const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
const widthOf = info => info.project.use.viewport?.width || 1440;

test('real Gutenberg post title preserves CJK tracking', async ({ page }, info) => {
  test.skip(!postId || ![390, 1440].includes(widthOf(info)), 'Requires WordPress editor fixture');
  await page.goto('/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.locator('#user_login').fill('admin');
  await page.locator('#user_pass').fill('ci-password');
  await Promise.all([
    page.waitForURL(/\/wp-admin\//, { waitUntil: 'domcontentloaded' }),
    page.locator('#wp-submit').click(),
  ]);
  await page.goto(`/wp-admin/post.php?post=${postId}&action=edit`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.wp?.data?.select?.('core/block-editor')?.getBlocks?.().length));
  const frame = page.locator('iframe[name="editor-canvas"]');
  const canvas = await frame.count() ? page.frameLocator('iframe[name="editor-canvas"]') : page;
  const editor = canvas.locator('.editor-styles-wrapper');
  await expect(editor).toBeVisible();
  await editor.evaluate(node => {
    const section = document.createElement('section');
    section.className = 'slateframe-cjk-editor-fixture';
    section.innerHTML = '<h1 lang="ja" class="wp-block-post-title">日本語の見出し「確認」</h1><h1 lang="en" class="wp-block-post-title">English title rhythm</h1>';
    node.prepend(section);
  });
  const fixture = editor.locator('.slateframe-cjk-editor-fixture');
  const japanese = fixture.locator('[lang="ja"]');
  const english = fixture.locator('[lang="en"]');
  expect(await japanese.evaluate(node => getComputedStyle(node).letterSpacing)).toBe('normal');
  expect(await english.evaluate(node => getComputedStyle(node).letterSpacing)).not.toBe('normal');
  await canvas.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
  expect(await fixture.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await japanese.evaluate(node => getComputedStyle(node).letterSpacing)).toBe('normal');
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await fixture.screenshot({ path: `test-artifacts/screenshots/cjk-gutenberg-title-viewport-${widthOf(info)}-rtl-200-forced-colors.png` });
});
