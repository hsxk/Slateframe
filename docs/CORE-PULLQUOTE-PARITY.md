# Native Core Pullquote parity

Slateframe preserves WordPress `core/pullquote` semantics, citations, author-defined text/background colors and native solid-color style. The theme supplies a conditional 386-byte stylesheet to bound long CJK/RTL text, prevent horizontal overflow and honor authored foreground colors inside nested blockquotes, and keep uncustomized borders visible in forced-colors mode. Gutenberg shares the stylesheet; WordPress owns serialization, markup and authoring. No runtime JavaScript or custom content model is introduced.

## Acceptance

A disposable published WordPress post covers default and solid-color Pullquotes, nested `<blockquote>` and `<cite>`, seven responsive widths (320/375/390/412/768/1440/1920px), LTR/RTL, 200%/400% text reflow, keyboard focus order, Axe WCAG 2.1 AA, forced colors, 404 asset isolation and fifteen exact-SHA screenshots. Authenticated Gutenberg tests Core serialization stability without editing the fixture. The disposable post is deleted in `finally`.

Manual Safari/VoiceOver and Firefox citation announcements, authored colors, RTL/CJK long-string reflow and forced-colors contrast remain release gates.
