# Core lightbox asset discovery

Slateframe keeps WordPress Core Image and Gallery lightboxes. The theme only conditionally enqueues its Photography presentation CSS; it does not replace Core's lightbox behavior.

On singular public content, exact Photography class markers take priority. Ordinary text and HTML without the serialized `"lightbox"` key no longer trigger `parse_blocks()`, avoiding needless Gutenberg parsing on non-photography articles. Non-string content is ignored. An actual `core/image` or `core/gallery` with `lightbox.enabled === true` still opts in; string `"false"` and boolean `false` do not.

Regression: `python3 -m unittest tests/test_contextual_asset_guards.py` runs the actual PHP functions in an isolated Core fixture and verifies that ordinary prose skips parsing, enabled lightboxes remain active, disabled flags stay off, marker-only content short-circuits parsing, and malformed content does not throw. The fixture is excluded from the distributable ZIP. Exact-HEAD WordPress+Chromium screenshots, WPCS, Theme Check, RTL, CJK, accessibility, and static budgets remain release gates.
