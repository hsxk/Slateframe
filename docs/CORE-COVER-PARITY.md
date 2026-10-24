# Core Cover parity

Slateframe leaves WordPress Core Cover in charge of background media, dimming, gradients, focal point, content position, minimum height, and editor serialization. The shared frontend/editor content-track containment rule only lets the Cover inner container shrink and wrap multilingual text instead of expanding the viewport. No custom renderer, script, or media download is introduced.

The disposable WordPress + Chromium test checks 320/375/390/412/768/1440/1920px in LTR and RTL, the author-defined minimum height, an image focal position, 200% text, forced-colors focus visibility, Axe, and screenshots for 390/1440 LTR/RTL plus 390 RTL at 200% forced colors. Authenticated Gutenberg testing round-trips native Core Cover serialization without modifying the editor post. Visual acceptance requires downloaded, inspected screenshots from the successful workflow for the exact PR HEAD SHA.

This remains presentation-only: site content, images, editor attributes, translation, and Core styling belong to the publisher and WordPress.
