/** Shared authentication boundary for real WordPress Gutenberg acceptance tests. */
const { expect } = require('@playwright/test');

async function openAuthenticatedEditor(page, postId) {
  const id = String(postId);
  if (!/^[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    throw new Error('The Gutenberg fixture requires a positive integer post ID.');
  }

  await page.goto('/wp-login.php', { waitUntil: 'domcontentloaded' });
  const loginURL = page.url();
  const loginAddress = new URL(loginURL);
  const origin = loginAddress.origin;
  const loginPath = loginAddress.pathname;
  if (!loginPath.endsWith('/wp-login.php')) {
    throw new Error('Unexpected WordPress login endpoint.');
  }
  const editorPath = loginPath.slice(0, -'/wp-login.php'.length) + '/wp-admin/post.php';
  await page.locator('#user_login').fill('admin');
  await page.locator('#user_pass').fill('ci-password');

  // Observe the actual login POST, not an intermediate dashboard load event.
  const loginResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.origin === origin && url.pathname === loginPath
      && response.request().method() === 'POST';
  });
  const [response] = await Promise.all([
    loginResponse,
    page.locator('#wp-submit').click({ noWaitAfter: true }),
  ]);
  if (response.status() >= 400) {
    throw new Error(`WordPress login POST returned HTTP ${response.status()}.`);
  }

  // Failed credentials can return an HTTP 200 response. Require a real session.
  await expect.poll(async () => {
    const cookies = await page.context().cookies(loginURL);
    return cookies.some((cookie) => cookie.name.startsWith('wordpress_logged_in_') && cookie.value);
  }).toBe(true);

  await page.goto(`${editorPath}?post=${encodeURIComponent(id)}&action=edit`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page).toHaveURL(/\/wp-admin\/post\.php\?/);
  const editorURL = new URL(page.url());
  expect(editorURL.origin).toBe(origin);
  expect(editorURL.pathname).toBe(editorPath);
  expect(editorURL.searchParams.get('post')).toBe(id);
  expect(editorURL.searchParams.get('action')).toBe('edit');
  await page.waitForFunction(() => {
    const select = window.wp?.data?.select?.('core/block-editor');
    return Boolean(select?.getBlocks?.().length);
  });
}

module.exports = { openAuthenticatedEditor };
