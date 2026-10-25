# Native Core Embed presentation

Slateframe does not add a provider, request remote oEmbed metadata, rewrite
iframe URLs, store consent state, or replace WordPress Core's markup. Playback,
security, privacy and provider behavior remain with Core, plugins and the site.

The conditional `core/embed` stylesheet (at most 350 bytes) bounds the figure,
wrapper and authored iframe, wraps long fallback URLs, and aligns mixed
CJK/RTL captions using logical properties. It does not force an aspect ratio,
overwrite author dimensions, or add JavaScript. Gutenberg uses the same CSS
through `add_editor_style()`.

The real WordPress/Chromium fixture publishes two serialized native Embed
blocks: a network-free `about:blank` iframe with an accessible title and a
fallback link. It verifies 320/375/390/412/768/1440/1920 LTR/RTL geometry,
inline or external conditional CSS, 200%/400% text, forced colors, keyboard
focus, Axe WCAG A/AA, and absence of the stylesheet on an unrelated 404.
Gutenberg parse/serialize roundtrips leave the editor post unchanged.
Screenshots cover 320/390/1440 LTR/RTL and 390 RTL at 200% forced colors.

This does not prove remote provider behavior, consent UX, playback or iframe
screen-reader usability. Those require manual Safari/VoiceOver and Firefox
review. Merge acceptance requires both exact-HEAD Actions and actual screenshot
inspection, not just a green local static test.
