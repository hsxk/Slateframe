# Native Core Latest Posts presentation

Slateframe preserves WordPress Core's core/latest-posts query, taxonomy filtering,
list/grid selection, date formatting, excerpts, and Gutenberg serialization.
It does not create a custom query, post type, REST endpoint, cache, or script.

The conditional block stylesheet (at most 500 bytes) keeps native list/grid
items, multilingual titles, dates and excerpts inside the authored content
column. It gives each post-title link a bounded 44px minimum height and
uses logical inline dimensions; Core remains responsible for column counts,
image sizing, ordering, and semantic markup. The same stylesheet is registered
for the block editor through add_editor_style().

## Reproducible acceptance

The browser test creates three disposable published posts in a unique category,
then a temporary page containing two native dynamic blocks filtered to that
category: list and three-column grid, each with titles, dates and excerpts.
It verifies native post URLs, 44px targets, seven widths (320, 375, 390, 412,
768, 1440, 1920), both LTR/RTL directions, no horizontal page or item escape,
200% and 400% text, keyboard focus, forced-colors and Axe WCAG A/AA.
Full-page screenshots avoid sticky-header occlusion and are captured at 320/390/1440 LTR/RTL and 390 RTL 200% forced colors.
An unrelated 404 must not load the conditional CSS. Fixture posts, page and
category are removed in finally.

Authenticated Gutenberg checks native list/grid block parse/serialize
round-trips without editing or saving the existing editor post. WordPress
Core editor metadata differs across versions: newer schemas may no longer
declare the legacy `postLayout` and `columns` attributes. The test reads
the registered Core schema, requires supported list/grid attributes to
round-trip, and rejects serialization of unsupported legacy attributes.
It independently verifies stable non-default post count, date and excerpt
settings. The server-side fixture still requires real Core list and grid
rendering, rather than weakening the presentation acceptance.

This does not claim manual Safari/VoiceOver, Firefox or live third-party plugin
coexistence acceptance. Review actual SHA-specific WordPress/Chromium screenshots
and both required Actions before merging; check the merged main SHA again.
