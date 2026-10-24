# Search query escaping and bidi isolation

WordPress get_search_query() defaults to an already attribute-escaped string. Escaping that default again produces visible HTML entities for ampersands, quotation marks, and angle brackets.

Slateframe requests get_search_query(false) and escapes once at each output boundary: esc_attr() for the search input and esc_html() for the heading. The heading wraps only the escaped query in a literal bdi element to isolate Arabic/Hebrew-leading terms from the surrounding translated heading. The existing translatable heading, GET form, parameter s, and native WordPress search behavior are unchanged. No custom search logic or JavaScript is introduced.

tests/browser/search-query-bidi.spec.js covers mixed Latin/CJK/Arabic, ampersands, quotes, input values, GET form semantics, bidi direction, and seven widths. tests/test_search_query_escape_contract.py guards against double escaping. A local PHP template fixture confirmed the original defect and the corrected inert-text output.

The exact new SHA must pass GitHub Actions and browser screenshot review before release acceptance.
