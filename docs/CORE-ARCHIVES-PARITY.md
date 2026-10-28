# Native Core Archives parity

Slateframe styles the WordPress Core Archives block without owning queries, dates, permalinks, counts, dropdown navigation, or markup. A block-scoped, at-most-550-byte stylesheet is registered with `wp_enqueue_block_style()` and included in Gutenberg editor styles.

## Contract

- Core generates monthly archive links, counts, and native dropdown options; the theme never intercepts navigation.
- List and select fit their own container, including long localized labels, RTL/CJK, and a minimum 44px logical target.
- CSS is loaded only when Core renders the block, including block widgets in the footer. No global archive stylesheet or JavaScript.
- Disposable WordPress posts in two months verify exact native URLs, select values, seven viewport widths, RTL/LTR, 200%/400% text, keyboard focus, forced-colors, Axe, screenshots, and authenticated Gutenberg round-trip serialization.
- Fixtures clean up in `finally`; no permalink, sidebar, or production content changes.

## Manual release review

Review exact-SHA WordPress/Chromium screenshots, then test Safari/VoiceOver and Firefox for native dropdown announcement and keyboard navigation. Check translated month labels with real language packs before claiming cross-browser acceptance.

## Exact 400% RTL focus and reflow

Native list and dropdown controls are checked at computed root 16/32/64px
in real WordPress/Chromium, preserving Core month URLs and the Gutenberg
list/dropdown roundtrip. At 320px and 390px RTL/400%, both link and select
must remain inside the viewport with at least 44px hit areas. The focused
native select is captured in a real 390x900 forced-colors viewport; CI
rejects absent, damaged, wrong-sized or non-PNG screenshot evidence.
No theme runtime script or Core block override is introduced.
