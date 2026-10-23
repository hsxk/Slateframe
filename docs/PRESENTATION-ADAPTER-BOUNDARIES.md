# Presentation adapter return-type boundaries

Slateframe exposes optional, plugin-neutral presentation hooks for author avatar HTML, language switcher HTML and attachment metadata. These hooks do not imply a plugin dependency or transfer ownership of user content to the theme.

The HTML hooks accept strings only. Malformed WP_Error, array, boolean, number and null responses render no optional HTML instead of reaching Core's HTML sanitizer with an invalid type. Valid strings still pass through `wp_kses_post()`; the theme does not trust the adapter's markup.

The attachment metadata hook accepts `array<string,string>`. Invalid top-level results fall back to WordPress Core's metadata. A deliberately empty array suppresses the optional details section. For a mixed array, only nonblank string keys and nonblank string values survive, retaining their original order and Unicode content. The attachment template still escapes every label and value with `esc_html()`. Malformed MIME values are omitted rather than cast to text.

Run `python3 -m unittest tests/test_presentation_adapter_boundaries.py` or `php tests/fixtures/presentation-adapter-boundaries.php.fixture`. The fixture loads the actual theme bootstrap, author template and metadata helper with isolated Core stubs. No database, plugin, external request or production site is involved. Exact-head Actions, WordPress compatibility, WPCS, Theme Check, browser and visual acceptance are required before merge.
