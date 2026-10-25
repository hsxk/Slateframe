# Native Core Details disclosure parity

This extends the existing [Core Details accessibility](CORE-DETAILS-ACCESSIBILITY.md) acceptance suite without replacing or weakening it. The existing suite covers 44/48/56px control settings, native open-by-default, print, Enter/Space and RTL reading contexts; this parity suite adds Gutenberg serialization, authored wide/full alignment, name grouping, Axe, full screenshot inventory and non-content conditional-asset isolation.

Slateframe uses WordPress Core `core/details` and the browser's native `<details>/<summary>` interaction. It does not introduce an accordion renderer, replace the disclosure marker, manage expanded state in JavaScript, or change saved Gutenberg content. A conditional, strictly 400-byte-capped CSS asset preserves authored wide/full alignment, bounds long multilingual summaries, gives the native summary a minimum `--slateframe-control` target, and exposes keyboard focus with system-compatible colors. The same asset is registered for Gutenberg.

## Real WordPress acceptance

A disposable published post contains a Core Details block with CJK/Arabic/unbroken summary text, a nested Core Paragraph and Button, plus content after the disclosure. Chromium verifies initial closed state, Enter opens, Space closes, native `list-item` marker behavior, 44px targets, link reachability, seven widths (320/375/390/412/768/1440/1920px), LTR/RTL, 200%/400% text, Axe WCAG 2.1 AA, focus and forced colors. Fourteen separately named `core-details-parity-*` viewport/direction screenshots and a parity forced-colors screenshot (without overwriting the existing `core-details-390-rtl-200-forced-colors.png`) are required by Actions at the exact SHA. A 404 route must not load the block-only stylesheet. The post is removed in `finally`.

Authenticated Gutenberg checks `core/details` summary, named disclosure grouping, wide alignment and nested Paragraph serialization without changing the original editor fixture. Manual Safari/VoiceOver and Firefox disclosure/marker/focus review remains a release gate.

## Native named disclosure groups

The separate real WordPress `core-details-grouping.spec.js` fixture checks two Core Details blocks with the same native `name` and a third independent disclosure. Keyboard Enter/Space must keep exactly one named disclosure open while leaving the ungrouped disclosure unchanged. It verifies native markers, focus, Axe, forced colors, RTL/CJK and 320/375/390/412/768/1440/1920px with 200%/400% reflow. Fourteen viewport/direction screenshots plus a 390px RTL forced-colors screenshot are mandatory exact-SHA Actions evidence; a 404 page must not enqueue the conditional stylesheet. This is browser-native behavior, not theme-owned accordion state or JavaScript.
