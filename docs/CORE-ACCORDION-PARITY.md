# Native Core Accordion parity

WordPress 6.9+ owns the four native blocks: `core/accordion`, `core/accordion-item`, `core/accordion-heading` and `core/accordion-panel`. Slateframe only provides a small, conditionally loaded presentation stylesheet. WordPress retains all Interactivity API state, ARIA/IDs, keyboard activation, auto-close and block serialization. WordPress 6.7 does not register the block; no polyfill or custom JavaScript is shipped.

The 800-byte `assets/css/core-accordion.css` is scoped to Core classes, reflows CJK/Arabic/unbroken headings, bounds toggle targets to the existing 44px Spatial token, preserves authored styles and icon position, and gives forced-colors keyboard focus a system-color outline. The same CSS is loaded in Gutenberg.

## Print

Collapsed panels are shown only under `@media print`; the original `hidden` / `inert` attributes and `aria-expanded` are never mutated by the theme. Returning to screen media must restore the collapsed view.

## Acceptance

Real WordPress + Chromium Playwright covers 320/375/390/412/768/1440/1920px, LTR/RTL and computed 16/32/64px root text, native mouse/Enter/Space activation with focus retention, Axe, forced colors, print/screen restoration with unchanged Core `hidden`/`inert` attributes, conditional asset delivery, and Gutenberg serialize/parse roundtrip. Four 390px/400% exact-HEAD screenshots are mandatory, checked for valid complete PNG and symlink safety by the CI verifier. The WordPress 6.7 / PHP 7.4 matrix must continue to pass. Browser tests and screenshot inspection, not static contracts alone, determine merge readiness.

Manual release checks remain Safari/VoiceOver and Firefox.
