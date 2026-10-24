/** Regression tests for the visitor color preference's WordPress install scope. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const runtime = fs.readFileSync(path.resolve(__dirname, '../../assets/js/theme.js'), 'utf8');

function fixture(homePath, protocol = 'https:', showToggle = true, brandPath = homePath) {
  const cookies = [];
  const attributes = {};
  const listeners = {};
  const root = { classList: { add() {} }, dataset: {} };
  const toggle = {
    dataset: { cookiePath: homePath },
    setAttribute(name, value) { attributes[name] = value; },
    addEventListener(name, listener) { listeners[name] = listener; },
  };
  const document = {
    documentElement: root,
    querySelector(selector) {
      if (selector === '[data-color-toggle]') return showToggle ? toggle : null;
      if (selector === '.slateframe-brand') return { pathname: brandPath };
      return null;
    },
    set cookie(value) { cookies.push(value); },
  };
  vm.runInNewContext(runtime, {
    document,
    requestAnimationFrame() {},
    getComputedStyle() { return { fontSize: '16px' }; },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    location: { protocol },
    addEventListener() {},
  }, { timeout: 1000 });
  return {
    cookies, attributes, root,
    click() {
      assert.equal(typeof listeners.click, 'function', 'color toggle must register a click handler');
      listeners.click();
    },
  };
}

test('root installation stores a root-scoped visitor preference', () => {
  const page = fixture('/');
  assert.equal(page.cookies.length, 0, 'no cookie before visitor action');
  page.click();
  assert.match(page.cookies[0], /^slateframe_color_mode=dark;/);
  assert.match(page.cookies[0], /; Path=\/;/);
});

test('subdirectory installation does not write a root-scoped cookie', () => {
  const page = fixture('/journal/');
  page.click();
  assert.match(page.cookies[0], /; Path=\/journal\/;/);
  assert.doesNotMatch(page.cookies[0], /; Path=\/;/);
});

test('language-specific home links cannot split a site-wide visitor preference', () => {
  const page = fixture('/', 'https:', true, '/ja/');
  page.click();
  assert.match(page.cookies[0], /; Path=\/;/);
  assert.doesNotMatch(page.cookies[0], /; Path=\/ja\/;/);
});

test('nested WordPress home path remains intact', () => {
  const page = fixture('/sites/knowledge/');
  page.click();
  assert.match(page.cookies[0], /; Path=\/sites\/knowledge\/;/);
});

test('encoded CJK installation path remains URL encoded', () => {
  const page = fixture('/%E5%86%99%E7%9C%9F/');
  page.click();
  assert.match(page.cookies[0], /; Path=\/%E5%86%99%E7%9C%9F\/;/);
});

test('HTTPS cookies use Secure and SameSite Lax', () => {
  const page = fixture('/blog/');
  page.click();
  assert.match(page.cookies[0], /;SameSite=Lax;Secure$/);
  assert.match(page.cookies[0], /;Max-Age=31536000;/);
});

test('HTTP loopback fixture does not set Secure', () => {
  const page = fixture('/blog/', 'http:');
  page.click();
  assert.match(page.cookies[0], /;SameSite=Lax$/);
  assert.doesNotMatch(page.cookies[0], /;Secure/);
});

test('toggle state and cookie value stay synchronized on repeated clicks', () => {
  const page = fixture('/blog/');
  page.click();
  assert.equal(page.root.dataset.slateframeColorMode, 'dark');
  assert.equal(page.attributes['aria-pressed'], 'true');
  page.click();
  assert.equal(page.root.dataset.slateframeColorMode, 'light');
  assert.equal(page.attributes['aria-pressed'], 'false');
  assert.match(page.cookies[1], /^slateframe_color_mode=light;/);
  assert.match(page.cookies[1], /; Path=\/blog\/;/);
});

test('pages without the theme toggle do not write preference cookies', () => {
  const page = fixture('/', 'https:', false);
  assert.equal(page.cookies.length, 0);
});
