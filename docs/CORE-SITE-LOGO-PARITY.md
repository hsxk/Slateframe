# Native Core Site Logo parity

Slateframe preserves WordPress Core `core/site-logo`, native custom-logo
theme support, uploaded media, home URL, image alternatives and block
attributes. It does not add a logo provider or JavaScript.

A conditional editor-shared stylesheet bounds large logos within their
authored column and gives small linked logos the shared 44px control target.

The browser fixture imports local media, temporarily changes the WordPress
custom_logo theme mod, renders linked and unlinked Core blocks, and restores
the previous theme mod and deletes fixtures in finally. Acceptance covers
320/375/390/412/768/1440/1920, RTL, text zoom, focus, Axe, forced colors,
404 asset isolation and authenticated Gutenberg serialization.

Safari/VoiceOver, Firefox, absent-logo behavior and localized image names
remain manual release checks.
