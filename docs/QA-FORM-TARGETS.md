# Native form target QA

Slateframe uses browser-native checkbox, radio, range, color and file controls. It does not substitute custom JavaScript controls or depend on a form plugin. The theme's shared `--slateframe-control` token must bound label targets for both nested inputs and sibling input/label markup, including WordPress comment consent.

The real WordPress Playwright test `tests/browser/native-form-targets.spec.js` inserts accessible sample controls into the theme's main landmark without persisting content. It checks 44/48/56px control sizes, LTR/RTL, 320–1920px viewports, checkbox/radio activation, keyboard operation, 400% equivalent font scaling, forced colors, WCAG axe findings, and file-input containment in a flex container.

A passing static contract or local Chromium check is not a substitute for the precise PR HEAD's successful GitHub Actions, genuine WordPress screenshots, and manual visual review. Keep native controls and focus outlines; do not weaken static budgets to accommodate this change.

## Narrow native file buttons

The 320px RTL/forced-colors screenshot revealed that the browser's file-selector button could be clipped inside a narrow flex item. Preserve the native input and keyboard behavior: the Core-first CSS now allows `::file-selector-button` text to wrap and grow beyond the 44px minimum height, rather than hiding or replacing it with JavaScript. Browser acceptance constrains both file inputs to 58px at 320/390/1440px, checks the actual pseudo-element bounds, and captures real Chromium screenshots. Keep this test in the existing Theme quality browser job; a CSS contract alone is not release acceptance.
