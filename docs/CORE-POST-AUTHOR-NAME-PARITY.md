# Native Core Post Author Name presentation

Slateframe presents the WordPress Core Post Author Name block without taking
ownership of the author profile, user permissions, archive URL, display name,
byline text or block serialization. The theme never replaces the native author
link, adds a custom author endpoint, or requires a profile plugin.

A small conditional stylesheet provides a logical, bounded 44px target for
linked author names. Unlinked names remain plain text. Both preserve natural
RTL/CJK wrapping, including long translated names. The same stylesheet is
registered with the editor to minimize authoring/frontend drift.

## WordPress and Chromium acceptance

A disposable published post renders linked and unlinked Core Post Author Name
blocks, including a native `_blank` target. The browser checks the real
WordPress author archive URL, seven responsive widths
(320/375/390/412/768/1440/1920), RTL/LTR, CJK, 200%/400% text,
keyboard focus, Axe, forced colors, LTR/RTL screenshots at every tested width,
and absence of the conditional stylesheet on an unrelated 404 page.
The fixture post is deleted in `finally`. An authenticated Gutenberg fixture
roundtrips the native `isLink` and `linkTarget` options without modifying
the editor post.

Manual Safari/VoiceOver and Firefox review of author-link announcements,
localized names and focus navigation remains a release gate. Visual acceptance
requires opening the exact-SHA WordPress/Chromium screenshots.
