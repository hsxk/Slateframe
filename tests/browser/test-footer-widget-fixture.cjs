const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { footerWidgetId, footerWidgetMutation } = require('./support/footer-widget-fixture');

const viewports = [320, 375, 390, 412, 768, 1440, 1920];
const ids = viewports.map(width => footerWidgetId(`viewport-${width}`));
assert.equal(new Set(ids).size, viewports.length, 'Parallel projects need distinct widget IDs');
assert.deepEqual(ids, [908170, 908171, 908172, 908173, 908174, 908175, 908176]);
for (const bad of ['viewport-999', 'viewport-320-extra', 'desktop', '', 'viewport-NaN']) {
  assert.throws(() => footerWidgetId(bad), /Unknown WordPress footer fixture project/);
}
for (const id of ids) {
  for (const operation of ['install', 'remove']) {
    const code = footerWidgetMutation(id, operation);
    assert.match(code, /flock\( \$lock, LOCK_EX \)/);
    assert.match(code, /finally \{/);
    assert.match(code, /flock\( \$lock, LOCK_UN \)/);
    assert.match(code, new RegExp(`block-${id}`));
    assert.match(code, /wp_set_sidebars_widgets/);
    assert.doesNotMatch(code, /https?:\/\//);
    const lint = spawnSync('php', ['-l'], { input: '<?php\n' + code, encoding: 'utf8' });
    assert.equal(lint.status, 0, lint.stderr + lint.stdout);
  }
  assert.match(footerWidgetMutation(id, 'install'), /fixture ID already exists/);
  assert.match(footerWidgetMutation(id, 'install'), /base64_decode/);
  assert.match(footerWidgetMutation(id, 'remove'), /array_diff/);
}
for (const bad of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN]) {
  assert.throws(() => footerWidgetMutation(bad, 'install'), /Invalid disposable/);
}
assert.throws(() => footerWidgetMutation(ids[0], 'overwrite'), /Invalid disposable/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'slateframe-footer-widget-'));
const stateFile = path.join(temp, 'options.json');
const initial = {
  widget_block: { 77: { content: 'pre-existing' } },
  sidebars_widgets: { 'footer-content': ['block-77'], 'sidebar-other': ['text-2'] },
};
fs.writeFileSync(stateFile, JSON.stringify(initial));
const phpStubs = `
function fixture_state() { return json_decode(file_get_contents(getenv('SLATEFRAME_FIXTURE_STATE')), true); }
function get_option($name, $default = false) { $state = fixture_state(); return $state[$name] ?? $default; }
function wp_get_sidebars_widgets() { return get_option('sidebars_widgets', array()); }
function update_option($name, $value) { $state = fixture_state(); $state[$name] = $value; file_put_contents(getenv('SLATEFRAME_FIXTURE_STATE'), json_encode($state)); }
function wp_set_sidebars_widgets($sidebars) { update_option('sidebars_widgets', $sidebars); }
`;
function runMutation(id, operation) {
  return new Promise((resolve, reject) => {
    const child = spawn('php', ['-r', phpStubs + footerWidgetMutation(id, operation)], {
      env: { ...process.env, SLATEFRAME_FIXTURE_STATE: stateFile },
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr || `php exit ${code}`)));
  });
}
(async () => {
  try {
    await Promise.all(ids.map(id => runMutation(id, 'install')));
    const populated = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.equal(Object.keys(populated.widget_block).length, ids.length + 1);
    assert.equal(populated.sidebars_widgets['footer-content'].length, ids.length + 1);
    for (const id of ids) {
      assert.match(populated.widget_block[id].content, /検索 Search 搜索/);
      assert(populated.sidebars_widgets['footer-content'].includes(`block-${id}`));
    }
    assert.deepEqual(populated.sidebars_widgets['sidebar-other'], ['text-2']);
    await Promise.all(ids.map(id => runMutation(id, 'remove')));
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')), initial);
    await runMutation(ids[0], 'install');
    await assert.rejects(runMutation(ids[0], 'install'), /fixture ID already exists/);
    await runMutation(ids[0], 'remove');
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')), initial);
    console.log('Footer widget fixture: 14 PHP lint cases and concurrent 7-worker isolation passed');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
