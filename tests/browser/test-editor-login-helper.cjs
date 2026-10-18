const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const load = Module._load;
function expect(value) {
  return {
    async toBeVisible() { assert.ok(value); },
    async toHaveURL(pattern) { assert.match(value.url(), pattern); },
    toBe(target) { assert.equal(value, target); },
  };
}
expect.poll = (read) => ({ async toBe(target) { assert.equal(await read(), target); } });
Module._load = function(name, ...args) {
  if (name === '@playwright/test') return { expect };
  return load.call(this, name, ...args);
};
const { openAuthenticatedEditor } = require('./support/editor-login');
Module._load = load;
function fixture(options={}) {
  const calls=[]; let current='http://127.0.0.1:8080/';
  const page={
    url:()=>current,
    async goto(target) {
      calls.push(['goto',target]);
      current=target.endsWith('/wp-login.php') ? (options.loginLanding || target) : (options.editorLanding || target);
    },
    locator:()=>({ visible:true }),
    request:{ async post(url,config) {
      calls.push(['post',url,config]);
      return {status:()=>options.status ?? 302,headers:()=>({location:options.location ?? config.form.redirect_to})};
    }},
    context:()=>({cookies:async()=>options.cookies ?? [{name:'wordpress_logged_in_ci',value:'signed'}]}),
    async waitForFunction() { if(options.noBlocks) throw new Error('No Gutenberg blocks'); }
  };
  return {page,calls};
}
test('authenticate via real Core request and navigate Gutenberg editor',async()=>{
  const {page,calls}=fixture(); await openAuthenticatedEditor(page,5);
  assert.equal(calls[0][1],'http://127.0.0.1:8080/wp-login.php');
  const post=calls.find(([type])=>type==='post');
  assert.equal(post[2].maxRedirects,0);
  assert.equal(post[2].form.testcookie,'1');
  assert.equal(post[2].form.redirect_to,'http://127.0.0.1:8080/wp-admin/post.php?post=5&action=edit');
});
test('reject invalid post ID before network',async()=>{
  const {page,calls}=fixture();
  await assert.rejects(openAuthenticatedEditor(page,'5&action=delete'),/positive integer/);
  assert.equal(calls.length,0);
});
test('reject HTTP 200 WordPress login error',async()=>await assert.rejects(openAuthenticatedEditor(fixture({status:200}).page,5),/HTTP 200/));
test('reject missing signed session',async()=>await assert.rejects(openAuthenticatedEditor(fixture({cookies:[]}).page,5),/false !== true/));
test('reject external response redirect',async()=>await assert.rejects(openAuthenticatedEditor(fixture({location:'https://invalid.example/wp-admin/'}).page,5),/outside/));
test('reject malicious external login landing before POST',async()=>{
  const {page,calls}=fixture({loginLanding:'https://invalid.example/wp-login.php'});
  await assert.rejects(openAuthenticatedEditor(page,5),/Unexpected WordPress login endpoint/);
  assert.equal(calls.filter(([type])=>type==='post').length,0);
});
test('reject same-origin shadow login before POST',async()=>{
  const {page,calls}=fixture({loginLanding:'http://127.0.0.1:8080/shadow/wp-login.php'});
  await assert.rejects(openAuthenticatedEditor(page,5),/Unexpected WordPress login endpoint/);
  assert.equal(calls.filter(([type])=>type==='post').length,0);
});
test('reject public fixture before navigation',async()=>{
  const saved=process.env.PLAYWRIGHT_TEST_BASE_URL;
  process.env.PLAYWRIGHT_TEST_BASE_URL='https://example.com/';
  try {
    const {page,calls}=fixture();
    await assert.rejects(openAuthenticatedEditor(page,5),/loopback WordPress fixture/);
    assert.equal(calls.length,0);
  } finally {
    if(saved===undefined) delete process.env.PLAYWRIGHT_TEST_BASE_URL;
    else process.env.PLAYWRIGHT_TEST_BASE_URL=saved;
  }
});
test('accept configured WordPress subdirectory fixture',async()=>{
  const saved=process.env.PLAYWRIGHT_TEST_BASE_URL;
  process.env.PLAYWRIGHT_TEST_BASE_URL='http://127.0.0.1:8080/blog';
  try {
    const {page,calls}=fixture({
      loginLanding:'http://127.0.0.1:8080/blog/wp-login.php',
      location:'http://127.0.0.1:8080/blog/wp-admin/',
      editorLanding:'http://127.0.0.1:8080/blog/wp-admin/post.php?post=5&action=edit'
    });
    await openAuthenticatedEditor(page,5);
    assert.equal(calls[0][1],'http://127.0.0.1:8080/blog/wp-login.php');
  } finally {
    if(saved===undefined) delete process.env.PLAYWRIGHT_TEST_BASE_URL;
    else process.env.PLAYWRIGHT_TEST_BASE_URL=saved;
  }
});
test('reject editor redirected to different post',async()=>{
  await assert.rejects(openAuthenticatedEditor(fixture({editorLanding:'http://127.0.0.1:8080/wp-admin/post.php?post=7&action=edit'}).page,5));
});
test('propagate missing Gutenberg block state',async()=>{
  await assert.rejects(openAuthenticatedEditor(fixture({noBlocks:true}).page,5),/No Gutenberg blocks/);
});
