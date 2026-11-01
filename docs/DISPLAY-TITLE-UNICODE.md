# Accessible discovery titles with Unicode-only blanks

WordPress permits posts without a title. Slateframe's classic templates and
related/404 discovery links use \`slateframe_get_display_title()\` to expose a
localized **Untitled** label when Core returns no readable title.

A title can look nonempty to \`trim()\` while still rendering as no spoken or
visible label: \`&nbsp;\`, \`&#160;\`, \`&#x200B;\`, U+00A0, U+3000, or U+200B.
The theme now checks a plain-text copy after Core's \`wp_strip_all_tags()\` and
HTML entity decoding. Unicode separators, controls and formatting-only text
do not qualify as a readable link name. Invalid UTF-8 also fails safely.

This is **presentation only**. Valid titles are returned unchanged, including
HTML entity spelling, mixed CJK/Arabic, emoji and safe inline markup. Slateframe
does not mutate post titles, Core Post Title blocks, permalinks, search,
indexing, SEO, or plugins. Output sites still apply their existing escaping.

\`tests/fixtures/display-title-unicode.php.fixture\` executes 20 actual PHP
cases; \`tests/test_display_title_unicode.py\` runs the fixture in the
required Static quality job and protects the unchanged Core-title contract.
The existing WordPress/Chromium discovery and title-bidi suites continue
to cover page layouts, keyboard access, RTL/CJK and 400% zoom. No runtime
CSS or JavaScript is added.
