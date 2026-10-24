# Featured media adapter boundaries

Slateframe renders the WordPress Core featured-image result in its editorial hero figure. The theme does not own the image, change attachment metadata, require a gallery plugin, or replace Core's image markup.

A valid image is still processed by Core's `WP_HTML_Tag_Processor` to preserve its responsive attributes and set `loading=eager`, `decoding=async`, and `fetchpriority=high` for the main hero. The existing caption remains filtered through Core's `wp_kses_post()`, preserving translated and CJK text.

The `wp_get_attachment_image` filter may be extended by other code. When it returns `false`, `null`, an array, an error object, blank text, or text with no `img` element, the theme now renders no hero rather than passing a non-string to the HTML processor or outputting an empty figure. The post's normal content is unaffected.

Run `python3 -m unittest tests/test_featured_media_boundaries.py` or `php tests/fixtures/featured-media-boundaries.php.fixture` for isolated regression checks. These tests do not access a database or production site. Exact-head Actions, real WordPress+Chromium browser checks, PHP compatibility, WPCS, Theme Check, and packaging remain required before merge.

## Filtered image HTML and output safety

WordPress filters can replace `wp_get_attachment_image()` output after Core has escaped its original attributes. The hero therefore sanitizes **filter-provided HTML before processing it** with Core `wp_kses_post()`, rather than trusting arbitrary event handlers or script elements. Core's post KSES allowlist does not retain all browser image priority/decoding attributes; `WP_HTML_Tag_Processor` reapplies the fixed `loading`, `decoding`, and `fetchpriority` values only **after** sanitization, so those attributes survive without admitting untrusted markup. This keeps Core `srcset`, `sizes`, translated `alt`, eager loading, asynchronous decoding, and high fetch priority without introducing a new media abstraction. The isolated PHP fixture now verifies this output boundary with intentionally unsafe filtered HTML; it is not a replacement for the real WordPress browser gate.
