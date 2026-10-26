# Native Core Separator parity

Slateframe keeps `core/separator` as a native semantic `<hr>` and lets WordPress own the default, wide and dots styles, authored colors, and block serialization. A 226-byte conditional stylesheet only bounds the element, uses the existing Slateframe border token for separators without an authored text color, and preserves forced-colors visibility. The same stylesheet is loaded in Gutenberg. No extra runtime JavaScript or custom block is introduced.

## Acceptance

A disposable published WordPress post exercises default, wide, dots and author-colored Core Separator variants among CJK/Arabic paragraphs. Chromium checks the original `<hr>` semantics and style classes, custom inline color, conditional asset loading, 320/375/390/412/768/1440/1920px, LTR/RTL, 200%/400% reflow, keyboard focus order, Axe WCAG 2.1 AA, forced colors, and a 404 page without the separator asset. Fourteen viewport/direction screenshots plus a 390px RTL forced-colors screenshot are required by exact-SHA Actions. The post is deleted in `finally`.

Authenticated Gutenberg verifies native wide/dots parse/serialize stability without modifying the existing editor fixture. WordPress Core and plugin content retain their own markup. Manual Safari/VoiceOver and Firefox separator announcements, styles and high-contrast review remain release gates.
