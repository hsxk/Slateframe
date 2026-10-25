# Native Core Latest Comments parity

Slateframe leaves comment approval, author identity, timestamps, ordering, post
permalinks, avatars, excerpts, and Gutenberg serialization to WordPress Core.
It adds no comment database, external avatar service, tracking, JavaScript,
moderation override, REST endpoint, or plugin dependency.

The conditional `core/latest-comments` stylesheet (550-byte ceiling) contains
long multilingual author names, comment links, and excerpts within the authored
column. Native metadata links use the shared bounded 44px target, logical
properties, and visible browser focus. The same stylesheet is registered in
Gutenberg through `add_editor_style()`; no universal stylesheet increase.

## Real WordPress acceptance

A disposable published post receives three approved multilingual comments and
one unapproved comment. A temporary page renders native Latest Comments blocks
with dates, avatars and excerpts enabled and disabled. The fixture verifies
real Core comment permalinks, approved-only output, dates/excerpts, link target
geometry, 320/375/390/412/768/1440/1920px, LTR/RTL, 200%/400% text, Axe,
keyboard focus, forced colors, full-page screenshot evidence, and 404 asset
isolation. Gravatar requests are intercepted **only in the browser test** with
an in-memory local image to keep the fixture offline and reproducible. The
WordPress comment and post records are removed in `finally`.

Authenticated Gutenberg verifies that native Latest Comments attributes survive
serialize/parse without editing the existing post. Attributes removed by a
future Core schema must not be reintroduced by the theme.

Manual Safari/VoiceOver and Firefox reading order, avatar alt text, localized
dates and 400% zoom remain to be reviewed. A visual PASS requires actually
opening the exact-HEAD real WordPress/Chromium screenshots and confirming both
required Actions before squash merging; merged main needs separate checks.
