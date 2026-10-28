# Native Core Post Featured Image presentation

Slateframe keeps WordPress Core responsible for the featured image, attachment
metadata, alternative text, source sets, native post permalink, link option,
image crop, and authored aspect ratio. No image processing, lightbox replacement,
new post type, custom image query, or JavaScript is introduced.

The conditional stylesheet bounds the native block and its linked image while
preserving Core's object-fit and aspect-ratio choices. Linked images have a
logical 44px minimum target. Gutenberg receives the same CSS through
add_editor_style(); the asset is absent from pages without the block.

## Acceptance

A disposable published WordPress post imports the theme-local legal PNG as a
real media attachment, sets native featured-image metadata and CJK/RTL alt text,
and renders linked and unlinked Core Post Featured Image blocks. WordPress Core
intentionally sets the linked image's `alt` to the post title (the link's
destination); the unlinked image retains its attachment `alt`. The test asserts
both distinct behaviors and confirms the attachment metadata remains intact,
without overriding either in the theme. Chromium checks
real image loading, responsive `srcset`, and permalink, 320/375/390/412/768/1440/1920px, RTL/LTR,
200%/400% text zoom, keyboard focus, Axe, forced colors, screenshot evidence,
and 404 asset isolation. Attachment and post are removed in finally.
Authenticated Gutenberg verifies native link-option serialization without
changing the editor fixture. Review exact-SHA screenshots before merging.

Manual Safari/VoiceOver and Firefox review remains a release gate, particularly
image alternative-text announcements and focus at 400% zoom.

## Full computed 400% featured-image acceptance

The disposable real WordPress featured-image fixture now measures seven widths
(320/375/390/412/768/1440/1920px), LTR/RTL, and verified computed root font
sizes 16/32/64px: 42 combinations. It checks native permalink and unlinked
behavior, Core's distinct linked/unlinked alt text, real media `srcset`, image
containment, minimum 44px link geometry, keyboard focus and editor roundtrips.

Three 390×900 viewport screenshots at 400% are mandatory: LTR, RTL, and RTL
forced colors, with the native image link scrolled into view and focused. The
CI gate checks PNG chunk CRCs, dimensions, IEND and rejects symlinked, missing,
truncated, corrupt or non-PNG captures. Inspect actual exact-HEAD WordPress
and Chromium images before merging. No new runtime CSS, PHP or JS is needed.
