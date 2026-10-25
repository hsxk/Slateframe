# Native Core Post Author Biography parity

Slateframe uses WordPress Core `core/post-author-biography` for the current
post's author description. Core owns the author ID, profile data, markup and
empty-biography behavior. The theme does not add an author database, SEO schema,
profile endpoints, shortcodes, custom JavaScript or user-specific content.

A conditional 114-byte presentation stylesheet protects very long CJK, Arabic
and unbroken biographies from overflowing narrow columns. It uses logical
properties and is shared with Gutenberg. Authored typography, alignment,
spacing, colors and content remain untouched.

A disposable WordPress author and post exercise the native description lookup,
empty-profile suppression, 320/375/390/412/768/1440/1920px layouts, RTL/LTR,
200%/400% text, forced colors, Axe and exact-SHA screenshots. A separate
authenticated editor test checks native serialization without changing the
editor fixture. The test removes its disposable post and user in `finally`.
A 404 page must not load the conditional asset.

Release review: inspect exact-SHA screenshots; manually review Safari/VoiceOver
and Firefox for translated biographies and empty-profile announcements.
