# Focused skip link: bounded 400% reflow

Slateframe keeps WordPress's native skip-to-main-content anchor and landmark
semantics. The visually hidden link must become visible on keyboard focus.
Previously the hidden utility's `white-space:nowrap` remained in force when
focused. A translated or unusually long label could extend beyond a narrow
viewport at 400% text zoom.

A real WordPress/Chromium run at `1e8f016` exposed an additional Core
cascade conflict: WordPress global styles apply
`.screen-reader-text { word-wrap: normal !important; }`. Since `word-wrap`
is an alias of `overflow-wrap`, an ordinary `overflow-wrap:anywhere` on the
focused skip link computed to `normal` even though the theme selector existed.
The focused selector now explicitly overrides this Core `!important` rule,
and the browser test checks both computed aliases without changing Core markup.

A subsequent real WordPress/Chromium run at `f2fbd561` found a second
issue at 768px LTR with 16px computed text: the focused link measured
43.375px high, below the 44px touch target contract. Increasing the
existing focused screen-reader/skip-link block padding from `.7rem` to
`.8rem` restores the minimum target without adding selectors or bytes to
the strict runtime CSS budgets. The browser still measures actual geometry
at each viewport and text scale; the static contract protects the padding.

The focused `.skip-link` now uses logical `inset-inline-start` (LTR/RTL),
a viewport-bounded maximum inline size, normal wrapping and
`overflow-wrap:anywhere`. This changes **only the visible focused state**:
the off-screen screen-reader utility, the original anchor destination and
all WordPress navigation semantics remain unchanged. No JavaScript or
custom navigation framework was added.

## Acceptance matrix

The real WordPress browser test uses computed 16/32/64px root text sizes
through the shared scale helper, LTR/RTL, and 320/375/390/412/768/1440/1920px
viewports. It focuses the link, checks the bounding rectangle and visible
outline, preserves at least a 44px target height, rejects horizontal document
overflow, and follows the anchor to the main landmark with Enter.

Three **390x900 full viewport** captures are required by Theme quality:

- `skip-link-390-ltr-400.png`
- `skip-link-390-rtl-400.png`
- `skip-link-390-rtl-400-forced-colors.png`

The verifier checks PNG signature, IHDR CRC and viewport dimensions; its
contract rejects missing, corrupt and wrong-sized evidence. Screenshots
must be downloaded and visually inspected at the exact PR HEAD SHA before
merging. The change does not relax existing CSS/JS runtime budgets, axe,
keyboard, Gutenberg or WordPress/PHP compatibility gates.
