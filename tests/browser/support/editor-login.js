/** Shared authentication boundary for real WordPress Gutenberg acceptance tests. */
const { expect } = require('@playwright/test');
const { buildLoginForm, validateLoginRedirect, hasWordPressSession } = require('./wordpress-login');

async function openAuthenticatedEditor(page, postId) {
  const id = String(postId);
  if (!/^[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    throw new Error('The Gutenberg fixture requires a positive integer post ID.');
  }

  // Never transmit the fixed CI credentials outside the loopback fixture.
  // Preserve WordPress installations mounted under a path prefix.
  const fixtureBase = new URL(process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:8080');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(fixtureBase.hostname) ||
      !['http:', 'https:'].includes(fixtureBase.protocol) || fixtureBase.username || fixtureBase.password) {
    throw new Error('Gutenberg authentication requires a loopback WordPress fixture.');
  }
  const basePath = fixtureBase.pathname.endsWith('/') ? fixtureBase.pathname : fixtureBase.pathname + '/';
  const expectedLoginURL = new URL(basePath + 'wp-login.php', fixtureBase.origin);
  await page.goto(expectedLoginURL.href, { waitUntil: 'domcontentloaded' });
  const loginURL = page.url();
  const loginAddress = new URL(loginURL);
  if (loginAddress.origin !== expectedLoginURL.origin ||
      loginAddress.pathname !== expectedLoginURL.pathname) {
    throw new Error('Unexpected WordPress login endpoint for the configured fixture.');
  }
  const editorPath = loginAddress.pathname.slice(0, -'/wp-login.php'.length) + '/wp-admin/post.php';
  const editorURL = loginAddress.origin + editorPath + '?post=' + encodeURIComponent(id) + '&action=edit';
  await expect(page.locator('#loginform')).toBeVisible();

  // Perform real Core authentication through the browser context's shared
  // cookie jar. Do not depend on a navigation POST event from clicking Submit.
  const response = await page.request.post(loginURL, {
    form: buildLoginForm(loginURL, editorURL),
    maxRedirects: 0,
  });
  validateLoginRedirect(response, loginURL, editorURL);
  await expect.poll(async () => {
    const cookies = await page.context().cookies(loginURL);
    return hasWordPressSession(cookies);
  }).toBe(true);

  await page.goto(editorURL, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/wp-admin\/post\.php\?/);
  const actual = new URL(page.url());
  expect(actual.origin).toBe(loginAddress.origin);
  expect(actual.pathname).toBe(editorPath);
  expect(actual.searchParams.get('post')).toBe(id);
  expect(actual.searchParams.get('action')).toBe('edit');
  await page.waitForFunction(() => {
    const select = window.wp?.data?.select?.('core/block-editor');
    return Boolean(select?.getBlocks?.().length);
  });
}

module.exports = { openAuthenticatedEditor };
