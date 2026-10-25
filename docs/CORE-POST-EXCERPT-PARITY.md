# Native Core Post Excerpt presentation

Slateframe styles WordPress Core Post Excerpt without owning excerpt text,
length, permalink, Read More label or serialization. No custom render callback,
truncation algorithm, plugin dependency or JavaScript is introduced.

The conditional stylesheet bounds the excerpt and provides a logical 44px
Read More link target. Plain-text excerpts remain plain text. Gutenberg uses
the same stylesheet through add_editor_style().

## Acceptance

A disposable published WordPress post renders native excerpts with new-line,
inline and omitted Read More links. Chromium checks the actual permalink,
320/375/390/412/768/1440/1920px, RTL/LTR, long CJK/Arabic and unbroken
text, 200%/400% text, keyboard, Axe, forced colors, screenshots and absence
of this block asset on unrelated 404 pages. The post is deleted in finally.
An authenticated Gutenberg fixture roundtrips More text, line placement and
excerpt length without changing the editor post.

Open exact-SHA screenshots before merge. Safari/VoiceOver and Firefox
announcements remain manual release gates.
