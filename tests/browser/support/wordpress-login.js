/** WordPress Core login request contract for Gutenberg acceptance tests. */
function buildLoginForm(loginURL, editorURL) {
  const login = new URL(loginURL);
  const editor = new URL(editorURL);
  if (login.origin !== editor.origin || !login.pathname.endsWith('/wp-login.php') ||
      !editor.pathname.startsWith(login.pathname.slice(0, -'wp-login.php'.length) + 'wp-admin/')) {
    throw new Error('The Gutenberg login target must be the same WordPress installation.');
  }
  return {
    log: 'admin',
    pwd: 'ci-password',
    'wp-submit': 'Log In',
    redirect_to: editor.href,
    testcookie: '1',
  };
}

function validateLoginRedirect(response, loginURL, editorURL) {
  const status = response.status();
  if (status !== 302 && status !== 303) {
    throw new Error(`WordPress login did not redirect after authentication (HTTP ${status}).`);
  }
  const location = response.headers()['location'];
  if (!location) throw new Error('WordPress login redirect did not provide a Location header.');
  const redirect = new URL(location, loginURL);
  const editor = new URL(editorURL);
  const adminPath = editor.pathname.slice(0, editor.pathname.indexOf('/wp-admin/') + '/wp-admin/'.length);
  if (redirect.origin !== editor.origin || !redirect.pathname.startsWith(adminPath)) {
    throw new Error('WordPress login redirected outside its authenticated admin area.');
  }
}

function hasWordPressSession(cookies) {
  return cookies.some((cookie) => cookie.name.startsWith('wordpress_logged_in_') && Boolean(cookie.value));
}

module.exports = { buildLoginForm, validateLoginRedirect, hasWordPressSession };
