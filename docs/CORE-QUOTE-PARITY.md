# Native Core Quote parity

Slateframe preserves native `core/quote`, semantic `<blockquote>`, nested paragraphs, optional `<cite>`, and WordPress-authored variants. The default accent remains; a 422-byte conditional stylesheet restores the plain variant by removing inherited inline-start border and padding. Long RTL/CJK text wraps without document overflow, and uncustomized default borders remain visible in forced-colors mode. Gutenberg shares the stylesheet. No runtime JavaScript or custom content model is introduced.

## Acceptance

A disposable published WordPress post covers default/plain quotes, native citation and keyboard order, seven widths (320/375/390/412/768/1440/1920px), LTR/RTL, 200%/400% text reflow, Axe WCAG 2.1 AA, forced colors, 404 asset isolation and fifteen exact-SHA screenshots. Authenticated Gutenberg checks native plain-variant parse/serialize stability without editing the fixture. The post is deleted in `finally`.

Manual Safari/VoiceOver and Firefox citation announcements, authored borders, RTL/CJK reflow and forced-colors contrast remain release gates.
