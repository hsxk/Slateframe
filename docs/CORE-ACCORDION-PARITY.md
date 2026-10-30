# Native Core Accordion parity

WordPress 6.9+ owns the four native blocks: `core/accordion`, `core/accordion-item`, `core/accordion-heading` and `core/accordion-panel`. Slateframe only provides a small, conditionally loaded presentation stylesheet. WordPress retains all Interactivity API state, ARIA/IDs, keyboard activation, auto-close and block serialization. WordPress 6.7 does not register the block; no polyfill or custom JavaScript is shipped.

The 800-byte `assets/css/core-accordion.css` is scoped to Core classes, reflows CJK/Arabic/unbroken headings, bounds toggle targets to the existing 44px Spatial token, preserves authored styles and icon position, and gives forced-colors keyboard focus a system-color outline. The same CSS is loaded in Gutenberg.

At 200–400% text enlargement, Core's decorative accordion `+` icon must not
consume the width needed by multilingual headings. The icon now inherits its
normal text size at 16px but caps its computed font size at 24px; `flex:none`
keeps the native icon from shrinking away. The title continues to inherit
`overflow-wrap:anywhere` from the native toggle button, avoiding a duplicate
declaration so the existing 800-byte asset budget is unchanged. No icon is
replaced, hidden or injected by JavaScript. Real WordPress browser assertions
check the computed icon size, nonzero rendered width, flex behavior and
document reflow across the seven supported widths, LTR/RTL and 16/32/64px
root fonts. Existing screenshots at 390px/400% must be inspected for the
actual icon/title balance before merging.

## Print

Collapsed panels are shown only under `@media print`; the original `hidden` / `inert` attributes and `aria-expanded` are never mutated by the theme. Returning to screen media must restore the collapsed view.

## Acceptance

Real WordPress + Chromium Playwright covers 320/375/390/412/768/1440/1920px, LTR/RTL and computed 16/32/64px root text, native mouse/Enter/Space activation with focus retention, Axe, forced colors, print/screen restoration with unchanged Core `hidden`/`inert` attributes, conditional asset delivery, and Gutenberg serialize/parse roundtrip. Four 390px/400% exact-HEAD screenshots are mandatory, checked for valid complete PNG and symlink safety by the CI verifier. The WordPress 6.7 / PHP 7.4 matrix must continue to pass. Browser tests and screenshot inspection, not static contracts alone, determine merge readiness.

Manual release checks remain Safari/VoiceOver and Firefox.
