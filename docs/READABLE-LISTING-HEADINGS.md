# Readable classic listing headings

The classic posts index uses WordPress Core's posts-page title (when the
posts page is separate) or the display-filtered site title. If that title
contains no readable characters, it presents the localized **Latest posts**
heading. It does not change the site identity, saved option, page title,
Core main query, or Gutenberg Core Query Title block.

The classic search results page retains the original Core search query,
escaped once for HTML, inside native `bdi` when readable. Empty or
Unicode-invisible queries show the localized **Search results** heading
without an empty bidi element. The native search form, result count,
pagination, and search semantics are untouched.

The shared `slateframe_has_readable_label()` helper excludes Unicode
separators, format/combining-only characters, HTML-only labels and known
blank fillers. Valid Japanese, Chinese, Korean, Arabic, emoji and Latin
text remain visible. No new CSS, JavaScript, plugin-owned data or SEO logic.

Regression: `python -m unittest discover -s tests -p
test_listing_readable_headings.py` executes both real templates with Core
adapters; `tests/browser/listing-readable-headings.spec.js` uses actual
WordPress HTTP routes rather than injecting WP-CLI-rendered main markup into
an unrelated page. The posts-index fixture temporarily changes `blogname` to
an invisible label and restores the exact previous value in `finally`; the
search fixture requests a URL-encoded invisible query and verifies both
`slateframe-forms` and `slateframe-search-form` stylesheets are enqueued.
This matters because the former injected-fragment fixture bypassed WordPress
conditional style enqueues and produced a false 320px/400% document overflow
from an unstyled native search input. The full-document overflow assertion
remains intact. Both routes check 320–1920px, LTR/RTL, 100%/400%, Axe,
keyboard focus, forced colors and four exact-HEAD screenshots. Screenshot
inspection and all GitHub Actions are mandatory before merging.
