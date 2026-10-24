# Core Media & Text parity

Slateframe retains WordPress Core's Media & Text markup, native media-right placement, author-selected mobile stacking, and Gutenberg attributes. It does not implement a custom media renderer, player, or JavaScript.

The shared frontend/editor rules only let the grid container, media track, and text track shrink to their assigned widths. Long CJK, Arabic, and unbroken link labels wrap in the content track. Images, videos, and iframes remain bounded by the media track. Core owns `grid-template-columns`, `grid-column`, `grid-row`, and intrinsic media ratios; no `!important` overrides are added.

The real disposable WordPress browser fixture checks 320/375/390/412/768/1440/1920px in LTR and RTL, stacked and non-stacked author intent, multilingual content, 200% text zoom, forced-colors keyboard focus, Axe, and screenshots `core-media-text-{390,1440}-{ltr,rtl}.png` and `core-media-text-390-rtl-200-forced-colors.png`. The authenticated Gutenberg test verifies both mobile stacking attributes round-trip and the existing editor post remains unchanged. Evidence must match the exact HEAD SHA; static assertions alone are insufficient. No production site or plugin dependency.
