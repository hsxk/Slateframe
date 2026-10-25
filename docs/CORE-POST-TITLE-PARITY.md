# Native Core Post Title presentation

Slateframe preserves WordPress Core's heading level, title text, post context,
permalink and linked/unlinked rendering. No custom title query, block rendering,
permalink rewriting, JavaScript or business logic is introduced.

The conditional stylesheet bounds long CJK/RTL and unbroken headings and gives
native linked titles a logical 44px minimum target. The same stylesheet is
included in Gutenberg via add_editor_style().

## Acceptance

A disposable published WordPress post renders native linked H2 and unlinked H3
Post Title blocks. Chromium checks Core's real permalink, 320/375/390/412/
768/1440/1920px, RTL/LTR, long CJK/Arabic/unbroken text, 200%/400% text,
keyboard focus, Axe, forced colors, screenshots and asset isolation on 404.
The post is removed in finally. An authenticated Gutenberg fixture verifies
Core's heading/link attribute roundtrip without changing the editor post.

Open exact-SHA screenshots before merging. Safari/VoiceOver and Firefox
heading/link announcements remain manual release gates.
