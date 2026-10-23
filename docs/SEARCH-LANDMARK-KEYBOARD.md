# Native search landmark and mobile keyboard

Slateframe's shared `searchform.php` is a Core-first GET search form used on search results, 404 recovery, and empty content states. Its explicit `role="search"` now has a translated accessible name (`Site search`), distinct from the input's existing visible-to-assistive-technology label (`Search for:`). This matters when a site owner adds another Core Search block to the footer: users navigating landmarks must be able to identify the theme's search region without relying on the surrounding heading.

The native `type="search"` input uses `enterkeyhint="search"` for supported mobile keyboards. It preserves WordPress's raw `get_search_query( false )` plus one context-specific attribute escape, so ampersands, quotes, CJK and RTL query text round-trip without double escaping. There is no custom JavaScript, new stylesheet, search index, or SEO behavior.

`tests/browser/search-landmark-keyboard.spec.js` exercises the real WordPress search and 404 routes at 320, 390 and 1440px. It checks the named landmark, input label, touch-sized submit, keyboard focus, native Enter submission, mixed CJK/RTL query fidelity, and page overflow. Screenshots are saved at 390 and 1440px for exact-SHA Actions artifact review. `tests/test_search_landmark_contract.py` guards the PHP and browser contracts. Neither test writes posts, widgets, or production data.
