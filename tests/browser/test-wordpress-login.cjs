const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildLoginForm, validateLoginRedirect, hasWordPressSession } = require('./support/wordpress-login');
const login = 'http://127.0.0.1:8080/wp-login.php';
const editor = 'http://127.0.0.1:8080/wp-admin/post.php?post=5&action=edit';
const response = (status, location) => ({ status: () => status, headers: () => location === undefined ? {} : { location } });
test('Core form sends credentials only to WordPress login', () => {
  assert.deepEqual(buildLoginForm(login, editor), {
    log: 'admin', pwd: 'ci-password', 'wp-submit': 'Log In', redirect_to: editor, testcookie: '1',
  });
});
test('reject login outside Core', () => assert.throws(() => buildLoginForm(login.replace('/wp-login.php', '/login'), editor), /same WordPress/));
test('reject cross-origin admin target', () => assert.throws(() => buildLoginForm(login, 'https://invalid.example/wp-admin/post.php'), /same WordPress/));
test('reject non-admin target', () => assert.throws(() => buildLoginForm(login, 'http://127.0.0.1:8080/'), /same WordPress/));
test('accept 302 Core editor redirect', () => assert.doesNotThrow(() => validateLoginRedirect(response(302, editor), login, editor)));
test('accept 303 relative admin redirect', () => assert.doesNotThrow(() => validateLoginRedirect(response(303, '/wp-admin/'), login, editor)));
test('reject 200 failed login even if it contains a form', () => assert.throws(() => validateLoginRedirect(response(200, editor), login, editor), /HTTP 200/));
test('reject 503 error', () => assert.throws(() => validateLoginRedirect(response(503, editor), login, editor), /HTTP 503/));
test('reject missing Location', () => assert.throws(() => validateLoginRedirect(response(302), login, editor), /Location/));
test('reject cross-origin redirect', () => assert.throws(() => validateLoginRedirect(response(302, 'https://invalid.example/wp-admin/'), login, editor), /outside/));
test('reject public redirect', () => assert.throws(() => validateLoginRedirect(response(302, '/'), login, editor), /outside/));
test('reject similarly prefixed non-admin path', () => assert.throws(() => validateLoginRedirect(response(302, '/wp-admin-fake/'), login, editor), /outside/));
test('support subdirectory admin only', () => {
  const nestedLogin = 'http://127.0.0.1:8080/blog/wp-login.php';
  const nestedEditor = 'http://127.0.0.1:8080/blog/wp-admin/post.php?post=5&action=edit';
  assert.equal(buildLoginForm(nestedLogin, nestedEditor).redirect_to, nestedEditor);
  assert.throws(() => validateLoginRedirect(response(302, '/wp-admin/'), nestedLogin, nestedEditor), /outside/);
  assert.doesNotThrow(() => validateLoginRedirect(response(303, '/blog/wp-admin/'), nestedLogin, nestedEditor));
});
test('reject missing or empty signed login cookie', () => {
  assert.equal(hasWordPressSession([]), false);
  assert.equal(hasWordPressSession([{ name: 'wordpress_logged_in_ci', value: '' }]), false);
  assert.equal(hasWordPressSession([{ name: 'wordpress_test_cookie', value: 'WP Cookie check' }]), false);
});
test('accept nonempty WordPress signed session', () => assert.equal(hasWordPressSession([{ name: 'wordpress_logged_in_ci', value: 'signed' }]), true));
