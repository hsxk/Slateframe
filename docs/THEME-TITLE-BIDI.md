# Mixed-script titles on theme-owned surfaces

WordPress post titles may contain Japanese, Chinese, Arabic, Hebrew, Latin names, numbers and punctuation. Without a text-direction boundary, titles can visually reorder neighboring dates, labels and link text on RTL pages.

Slateframe uses native HTML `bdi` around the title content in its own single-post, Page and attachment headings, archive cards, related-reading links and 404 recent-post recovery links. The existing WordPress title source, `wp_kses_post()` sanitization, heading levels, permalink targets and link focus remain unchanged. The element automatically isolates mixed direction without forcing LTR or adding CSS/JS.

This deliberately does not alter `core/post-title` blocks, Gutenberg serialization, taxonomy names, or plugin-authored markup. The existing Core Post Title parity tests remain authoritative.

`tests/test_theme_title_bidi.py` protects all six surfaces and PHP syntax. `tests/browser/title-bidi.spec.js` uses a real WordPress/Chromium fixture for mixed CJK/Arabic/Latin text at 320/390/1440 widths, LTR/RTL, 100%/400% root font, Axe and keyboard focus; the two screenshots must be inspected from the exact PR HEAD before merging. The existing related-reading zoom test now mutates the nested `bdi` text rather than deleting the isolation node.
