const assert = require('node:assert/strict');
const { canonicalizeCoreQueryDefaults } = require('./support/core-query-defaults');

const before = '<!-- wp:query {"queryId":0,"query":{"perPage":6,"inherit":false},"align":"wide"} -->';
const after = '<!-- wp:query {"queryId":0,"query":{"perPage":6,"inherit":false,"excludeCurrent":null},"align":"wide"} -->';
assert.equal(canonicalizeCoreQueryDefaults(before), canonicalizeCoreQueryDefaults(after),
  'Core-added null default must not masquerade as a saved content edit');
assert.equal(canonicalizeCoreQueryDefaults(after), before);
for (const value of ['true', 'false']) {
  const edited = after.replace('null', value);
  assert.notEqual(canonicalizeCoreQueryDefaults(edited), canonicalizeCoreQueryDefaults(before),
    'Explicit Query Loop behavior must remain observable: ' + value);
}
const alteredPageSize = after.replace('"perPage":6', '"perPage":7');
assert.notEqual(canonicalizeCoreQueryDefaults(alteredPageSize), canonicalizeCoreQueryDefaults(before),
  'A real Query Loop edit must still fail the unchanged-content contract');
const otherBlock = '<!-- wp:group {"excludeCurrent":null} -->';
assert.equal(canonicalizeCoreQueryDefaults(otherBlock), otherBlock,
  'Unrelated block attributes must not be normalized');
const twoQueries = before + '\n' + after;
assert.equal(canonicalizeCoreQueryDefaults(twoQueries), before + '\n' + before,
  'Only equivalent Core Query defaults are normalized across multiple blocks');
assert.throws(() => canonicalizeCoreQueryDefaults(123), TypeError);
assert.throws(() => canonicalizeCoreQueryDefaults('<!-- wp:query {invalid} -->'), SyntaxError,
  'Malformed Query Loop metadata must never be silently ignored');
console.log('Core Query null-default normalization: 8 assertions passed');
