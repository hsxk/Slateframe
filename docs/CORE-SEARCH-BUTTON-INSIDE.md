# Native Core Search button-inside reflow

Core owns Search form semantics, label, input, submit action, block serialization and keyboard behavior. Slateframe supplies only bounded presentation, without a search API or extra JavaScript.

At 640px and narrower, button-inside Search blocks with a real input use a zero-minimum grid track and the shared component gap. The native submit button becomes full-width and wraps long multilingual labels, retaining the 44px control baseline. This does not affect generic forms, plugin controls, or Core Buttons. Outside and no-button variants keep their existing rules.

The browser acceptance fixture creates and removes a real WordPress page containing a dynamic `wp:search` block. It checks eight viewports (320–1920px), RTL/LTR, 200% and 400% text, form data, native search landmark, accessible names, 44px targets, horizontal containment, Tab order, forced-colors focus and Axe. It captures 320px RTL/400%, 390px RTL/200% forced-colors, and 1440px LTR images.

Do not claim visual approval until the exact HEAD SHA Actions succeed and the actual WordPress/Chromium screenshot artifacts are inspected.

## Complete 400% computed-root-font evidence

The real WordPress Core Search button-inside fixture now checks all eight 320/375/390/412/640/768/1440/1920px widths × LTR/RTL × computed 16/32/64px root text (48 cases), including 400% desktop reflow that the prior mobile-only scale matrix missed. It uses the shared root-scale helper and asserts the computed root size and bounded 44px control token rather than assuming an inline style took effect. Three mandatory 390×900 real WordPress/Chromium viewport PNGs show 400% LTR, RTL and RTL forced-colors keyboard focus; each capture scrolls the native submit control into view. CI checks complete PNG chunks/CRC/dimensions, symlink safety and negative cases. The existing 320px RTL and 200% forced-colors evidence remains intact. This is presentation-only: Core retains its Search semantics, form submission and keyboard behavior.
