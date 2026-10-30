# Native Core Pullquote: bounded high-zoom spacing

Slateframe keeps WordPress Core `core/pullquote` and its default/solid variants, authored colors, citations, keyboard order, and Gutenberg serialization. This change only bounds the block's vertical presentation spacing.

## Problem and rule

The existing `padding-block: clamp(1.4rem, 3vw, 2.4rem)` grows from 22.4px to 89.6px per side at a 390px viewport when the root font increases from 16px to 64px. At 400% text size, the resulting blank space reduces usable reading area.

`assets/css/reading.css` now uses `min(clamp(1.4rem, 3vw, 2.4rem), 40px)` for native Pullquote. The same rule applies to front end and editor; no new CSS request, JavaScript, markup transformation, or plugin behavior is introduced.

At 390px, LTR/RTL, 16/32/64px root: 22.4 / 40 / 40px. At 1440px: 38.4 / 40 / 40px. The default 16px layout is unchanged at all seven supported widths (320, 375, 390, 412, 768, 1440, 1920).

## Acceptance

- Run the existing real WordPress `tests/browser/core-pullquote-parity.spec.js`, including native block serialization, both variants, authored colors, CJK/Arabic, keyboard, Axe, forced-colors, and viewport screenshots.
- Verify both variants' computed `paddingBlockStart` for the full width/direction/font matrix; no document horizontal overflow or clipping.
- Require the unchanged 7,000-byte `reading.css` budget and the existing 440-byte conditional `core-pullquote.css` budget.
- Inspect the exact PR HEAD's real WordPress/Chromium screenshots for mobile/desktop and all Appearance modes; check Gutenberg, Photography/Lightbox, Portfolio, Knowledge, article, header, search, forms, footer, and distributable ZIP before merging.
- Merge only after both Theme quality and Photography workflows succeed for the exact SHA; verify main merge SHA and resync the long-lived branch.

This is a presentation fix, not a change to authored content, WordPress Core semantics, or the theme's free/open-source product boundary.
