const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const postId = process.env.SLATEFRAME_EDITOR_POST_ID;
const widthOf = info => info.project.use.viewport?.width || 1440;

test('real Gutenberg post title preserves inherited and explicit CJK tracking', async ({ page }, info) => {
  test.skip(!postId || ![390, 1440].includes(widthOf(info)), 'Requires WordPress editor fixture');
  await page.goto('/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.locator('#user_login').fill('admin');
  await page.locator('#user_pass').fill('ci-password');
  await page.locator('#wp-submit').click();
  await page.goto(`/wp-admin/post.php?post=${postId}&action=edit`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/wp-admin\/post\.php\?post=/);
  await page.waitForFunction(() => Boolean(window.wp?.data?.select?.('core/block-editor')?.getBlocks?.().length));
  // Core's welcome dialog must be dismissed before taking editor evidence.
  const welcomeGuide = page.locator('[role="dialog"]').filter({ hasText: /Welcome to the editor/i }).first();
  try {
    await welcomeGuide.waitFor({ state: 'visible', timeout: 2_000 });
    const closeButton = welcomeGuide.getByRole('button', { name: /close/i }).first();
    await expect(closeButton).toBeVisible();
    await closeButton.click();
  } catch (error) {
    if (await welcomeGuide.isVisible().catch(() => false)) throw error;
  }
  await expect(welcomeGuide).toBeHidden();
  const frame = page.locator('iframe[name="editor-canvas"]');
  const canvas = await frame.count() ? page.frameLocator('iframe[name="editor-canvas"]') : page;
  const editor = canvas.locator('.editor-styles-wrapper');
  await expect(editor).toBeVisible();
  await editor.evaluate(node => {
    const section = document.createElement('section');
    section.className = 'slateframe-cjk-editor-fixture';
    section.innerHTML = '<div lang="ja"><h1 class="wp-block-post-title">日本語の見出し「確認」</h1><h1 lang="en" class="wp-block-post-title">English override</h1></div><h1 lang="zh-Hant" class="wp-block-post-title">繁體中文標題</h1><h1 lang="ko-KR" class="wp-block-post-title">한국어 제목</h1><h1 lang="en" class="wp-block-post-title">English title rhythm</h1>';
    node.prepend(section);
  });
  const fixture = editor.locator('.slateframe-cjk-editor-fixture');
  const inheritedJapanese = fixture.locator('[lang="ja"] > .wp-block-post-title:not([lang])');
  const cjk = fixture.locator('[lang="ja"] > .wp-block-post-title:not([lang]), [lang="zh-Hant"], [lang="ko-KR"]');
  const english = fixture.locator('[lang="en"]');
  await expect(inheritedJapanese).toHaveAttribute('class', /wp-block-post-title/);
  await expect(cjk).toHaveCount(3);
  for (const heading of await cjk.all()) {
    expect(await heading.evaluate(node => getComputedStyle(node).letterSpacing)).toBe('normal');
  }
  await expect(english).toHaveCount(2);
  for (const heading of await english.all()) {
    expect(await heading.evaluate(node => getComputedStyle(node).letterSpacing)).not.toBe('normal');
  }
  await canvas.locator('html').evaluate(node => { node.dir = 'rtl'; node.style.fontSize = '200%'; });
  expect(await fixture.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await page.emulateMedia({ forcedColors: 'active' });
  for (const heading of await cjk.all()) {
    expect(await heading.evaluate(node => getComputedStyle(node).letterSpacing)).toBe('normal');
  }
  await expect(welcomeGuide).toBeHidden();
  await fixture.scrollIntoViewIfNeeded();
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await fixture.screenshot({ path: `test-artifacts/screenshots/cjk-gutenberg-title-viewport-${widthOf(info)}-rtl-200-forced-colors.png` });
});
