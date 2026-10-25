# Native Core Details disclosure parity

Slateframe uses WordPress Core `core/details` and the browser's native `<details>/<summary>` interaction. It does not introduce an accordion renderer, replace the disclosure marker, manage expanded state in JavaScript, or change saved Gutenberg content. A conditional, strictly 400-byte-capped CSS asset preserves authored wide/full alignment, bounds long multilingual summaries, gives the native summary a minimum `--slateframe-control` target, and exposes keyboard focus with system-compatible colors. The same asset is registered for Gutenberg.

## Real WordPress acceptance

A disposable published post contains a Core Details block with CJK/Arabic/unbroken summary text, a nested Core Paragraph and Button, plus content after the disclosure. Chromium verifies initial closed state, Enter opens, Space closes, native `list-item` marker behavior, 44px targets, link reachability, seven widths (320/375/390/412/768/1440/1920px), LTR/RTL, 200%/400% text, Axe WCAG 2.1 AA, focus and forced colors. Fourteen viewport/direction screenshots and a forced-colors screenshot are required by Actions at the exact SHA. A 404 route must not load the block-only stylesheet. The post is removed in `finally`.

Authenticated Gutenberg checks `core/details` summary, named disclosure grouping, wide alignment and nested Paragraph serialization without changing the original editor fixture. Manual Safari/VoiceOver and Firefox disclosure/marker/focus review remains a release gate.
