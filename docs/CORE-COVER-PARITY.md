# Core Cover parity

Slateframe leaves WordPress Core Cover in charge of background media, dimming, gradients, focal point, content position, minimum height, and editor serialization. The shared frontend/editor content-track containment rule only lets the Cover inner container shrink and wrap multilingual text instead of expanding the viewport. No custom renderer, script, or media download is introduced.

The disposable WordPress + Chromium test checks 320/375/390/412/768/1440/1920px in LTR and RTL, the author-defined minimum height, an image focal position, 200% text, forced-colors focus visibility, Axe, and screenshots for 390/1440 LTR/RTL plus 390 RTL at 200% forced colors. Authenticated Gutenberg testing round-trips native Core Cover serialization without modifying the editor post. Visual acceptance requires downloaded, inspected screenshots from the successful workflow for the exact PR HEAD SHA.

This remains presentation-only: site content, images, editor attributes, translation, and Core styling belong to the publisher and WordPress.

## Computed 400% text and viewport acceptance

The disposable real WordPress Core Cover fixture now checks seven widths (320/375/390/412/768/1440/1920px), LTR/RTL, and computed 16/32/64px root text (42 cases), not just a single 200% case. It verifies the bounded 44px control token, inner-container containment, native authored min-height, decorative image geometry, and focal position without overriding Core Cover's media or overlay implementation. Existing screenshots and Gutenberg serialization remain in place.

Three additional 390×900 WordPress/Chromium viewport captures are mandatory at 400%: LTR, RTL, and RTL forced-colors with a focused link scrolled into view. CI rejects missing, linked, truncated, corrupt, wrong-size and non-PNG captures, and static negative tests guard the evidence verifier. This is an acceptance improvement only: no theme runtime CSS, PHP, JavaScript, or dependency is added. Exact-SHA Actions and actual downloaded screenshot review are still required before merging.
