/**
 * Normalize only the optional Core Query `excludeCurrent: null` default.
 * Gutenberg can materialize this no-op attribute when an unrelated block is
 * inserted/undone. All other saved markup remains byte-for-byte comparable.
 */
function canonicalizeCoreQueryDefaults(serialized) {
  if (typeof serialized !== 'string') {
    throw new TypeError('Serialized Gutenberg content must be a string');
  }
  return serialized.replace(/<!-- wp:query (\{[^\r\n]*\}) -->/g, (comment, json) => {
    const attributes = JSON.parse(json);
    if (!attributes.query || !Object.prototype.hasOwnProperty.call(attributes.query, 'excludeCurrent') ||
        attributes.query.excludeCurrent !== null) {
      return comment;
    }
    delete attributes.query.excludeCurrent;
    return '<!-- wp:query ' + JSON.stringify(attributes) + ' -->';
  });
}

module.exports = { canonicalizeCoreQueryDefaults };
