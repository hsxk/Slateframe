# Mixed-direction author metadata

Post bylines use WordPress Core's author display name, URL and localized date. A display name can mix Arabic, Hebrew, CJK, Latin text, punctuation and digits; in RTL documents, adjacent separators and the publication date must not reorder the name.

Slateframe wraps only the author-name text in native `<bdi>`, inside the existing link when the author URL is valid, or in the existing unlinked byline when it is absent. The separator remains `aria-hidden`, the localized `<time datetime>` remains Core-owned, and the author URL filter, escaping, screen-reader “By” text and wrapping group remain unchanged. No forced LTR direction, JavaScript, schema, plugin or CSS is added.

`tests/test_entry_byline_bidi.py` executes the actual PHP helper for linked, unlinked and empty author names, including HTML escaping and date preservation. `tests/browser/entry-meta.spec.js` retains the `<bdi>` node when inserting a long multilingual fixture, verifies computed isolation and checks RTL zoom wrapping. This must be validated on the exact PR HEAD by Theme quality and the real WordPress/Chromium Browser smoke job before merging.
