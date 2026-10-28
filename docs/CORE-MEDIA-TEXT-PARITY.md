# Core Media & Text parity

Slateframe retains WordPress Core's Media & Text markup, native media-right placement, author-selected mobile stacking, and Gutenberg attributes. It does not implement a custom media renderer, player, or JavaScript.

The shared frontend/editor rules only let the grid container, media track, and text track shrink to their assigned widths. Long CJK, Arabic, and unbroken link labels wrap in the content track. Images, videos, and iframes remain bounded by the media track. Core owns `grid-template-columns`, `grid-column`, `grid-row`, and intrinsic media ratios; no `!important` overrides are added.

The real disposable WordPress browser fixture checks 320/375/390/412/768/1440/1920px in LTR and RTL, stacked and non-stacked author intent, multilingual content, 200% text zoom, forced-colors keyboard focus, Axe, and screenshots `core-media-text-{390,1440}-{ltr,rtl}.png` and `core-media-text-390-rtl-200-forced-colors.png`. The authenticated Gutenberg test verifies both mobile stacking attributes round-trip and the existing editor post remains unchanged. Evidence must match the exact HEAD SHA; static assertions alone are insufficient. No production site or plugin dependency.

## Computed 400% acceptance and conditional CSS

A 278-byte `assets/css/core-media-text.css` file is registered only for native
`core/media-text` through `wp_enqueue_block_style()` and shared with Gutenberg
through `add_editor_style()`. It bounds intrinsic media and content widths and
wraps long multilingual text without changing Core's grid, crop or stacking.
The static CI budget is 400 bytes; the base theme's existing Core rule remains.

The disposable WordPress fixture preserves **both** author choices: stacked
mobile media and explicitly unstacked media on the right. It checks seven
320/375/390/412/768/1440/1920px widths × LTR/RTL × computed 16/32/64px
root font sizes (42 combinations), image/media/content containment, no page
horizontal overflow, 44px control token, conditional asset delivery, native
keyboard focus and axe. The Gutenberg test still round-trips both author
choices without modifying the editor document.

CI requires three additional real WordPress/Chromium 390×900 viewport PNGs at
400%: LTR, RTL and RTL forced-colors, with the native link focused and
scrolled into view. The validator rejects missing, wrong-size, corrupt,
truncated, non-PNG or linked files. Inspect exact HEAD screenshots and the
reproducible distributable ZIP before merging.
