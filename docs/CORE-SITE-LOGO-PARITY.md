# Native Core Site Logo parity

Slateframe preserves WordPress Core `core/site-logo`, native custom-logo
theme support, uploaded media, home URL, image alternatives and block
attributes. It does not add a logo provider or JavaScript.

A conditional editor-shared stylesheet bounds large logos within their
authored column and gives small linked logos the shared 44px control target.

The browser fixture imports local media and installs a uniquely named,
request-scoped disposable MU-plugin filter for the one test post. It never
changes the shared WordPress site logo option or theme mod, avoiding races
with other Playwright workers. It removes the filter and media/post in finally. Acceptance covers
320/375/390/412/768/1440/1920, RTL, text zoom, focus, Axe, forced colors,
404 asset isolation and authenticated Gutenberg serialization.

Safari/VoiceOver, Firefox, absent-logo behavior and localized image names
remain manual release checks.
