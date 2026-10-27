# Focused skip link: bounded 400% reflow

Slateframe keeps WordPress's native skip-to-main-content anchor and landmark
semantics. The visually hidden link must become visible on keyboard focus.
Previously the hidden utility's `white-space:nowrap` remained in force when
focused. A translated or unusually long label could extend beyond a narrow
viewport at 400% text zoom.

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
