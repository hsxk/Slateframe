# Native Core Post Comments Count parity

Slateframe presents WordPress `core/post-comments-count` as a **non-interactive count**.
WordPress owns comment approval, moderation, post context, number formatting and
Gutenberg serialization. This theme neither counts comments itself nor adds
links, queries, user metadata, or comment APIs.

The conditional `wp_enqueue_block_style()` stylesheet only prevents long
localized text from overflowing narrow RTL/CJK containers and gives numeric
counts tabular alignment. It is shared with the editor; no JavaScript is added.

A disposable WordPress Query Loop fixture checks zero, pending-only, one and
two approved comments; the browser then verifies seven widths (320, 375, 390,
412, 768, 1440, 1920), RTL/LTR, 200%/400% text, Axe, keyboard semantics,
forced colors, screenshots, Gutenberg serialization, 404 asset isolation and
ZIP inclusion. Fixture posts and comments are removed in `finally`.

Before release, review exact-HEAD screenshots and manually verify localized
count announcements in Safari/VoiceOver and Firefox.
