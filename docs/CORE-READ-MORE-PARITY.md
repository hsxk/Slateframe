# Native Core Read More parity

Slateframe keeps WordPress Core `core/read-more` responsible for the post context,
permalink, localized label, accessible post-title suffix and `linkTarget`.
This is distinct from the excerpt-breaking `core/more` block. The theme adds
only a 238-byte conditional stylesheet for 44px links and RTL/CJK wrapping,
shared with Gutenberg. No theme-specific post query, route or JavaScript.

A disposable published post is selected by a native Query Loop search. Real
WordPress/Chromium acceptance checks both permalinks, new-tab behavior, the
screen-reader post title, seven widths (320–1920px), RTL/LTR, 200%/400% text
zoom, 44px targets, focus, Axe, forced colors, screenshots, click-through and
404 asset isolation. The test deletes both fixture posts in `finally`.
Authenticated Gutenberg checks Core content/target serialization without
modifying the editor fixture. Static checks enforce the 300-byte CSS cap.

Release review: inspect exact-SHA screenshots and manually verify Safari/
VoiceOver and Firefox new-tab and localized link announcements.
