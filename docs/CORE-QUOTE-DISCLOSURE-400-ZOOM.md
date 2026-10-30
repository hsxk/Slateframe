# Native Core Quote and Details: high-zoom inline space

Slateframe preserves the WordPress Core `core/quote` and `core/details` blocks. No custom HTML, JS, data model, or Gutenberg control is introduced.

## Observed problem

With a 64px root font (400% text enlargement), the existing standard Quote's `1rem` inline start padding becomes 64px. The Slateframe disclosure block style's `clamp(.9rem,2vw,1.25rem)` becomes 57.6px on each inline side at a 390px viewport, leaving an unnecessarily narrow reading column.

The native Core presentation now uses:

- Standard Quote: `padding-inline-start:min(var(--slateframe-space-4),24px)`. The Core plain variant remains 0.
- `is-style-slateframe-disclosure`: `padding-inline:min(clamp(.9rem,2vw,1.25rem),24px)`. Native disclosure marker, summary keyboard behavior and authored alignments remain unchanged.

At 390px RTL with 16/32/64px root, standard Quote is 16/24/24px (was 16/32/64px); disclosure is 14.4/24/24px (was 14.4/28.8/57.6px). At 1440px, default 16px values remain 16px and 20px respectively. The default 16px values are unchanged across 320/375/390/412/768/1440/1920px.

## Verification

- Isolated Chromium rendered 42 states each for original and revised full theme CSS, with no horizontal document overflow. This is a preflight, not GitHub Actions acceptance.
- The real WordPress `core-quote-parity.spec.js` and `core-details-parity.spec.js` now test all seven widths, both writing directions, and 16/32/64px roots, with computed padding assertions.
- Existing Core semantic, Gutenberg, keyboard, Axe, forced-colors, screenshots, print and release tests remain intact.
- The shared `reading.css` remains below its original 7,000-byte cap. No new runtime request is introduced.
- Exact-SHA Theme quality and Photography Actions, real WordPress/Chromium screenshots, and package checks must succeed before merging.

These are presentation-only bounds. Authored content and WordPress Core semantics remain the source of truth.
