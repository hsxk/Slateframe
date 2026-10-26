# Native Core Comments Title parity

Slateframe keeps WordPress Core in charge of approved comment counts, post-title inclusion, heading levels, localized labels and native markup. Only a conditional Gutenberg-shared CSS presentation asset is added; no moderation, content API, JavaScript or custom renderer is introduced.

## Acceptance

A disposable WordPress post uses a native `core/comments` parent with one `core/comments-title` child at a time: H2 with the post title, then H3 without it after a disposable post update. This avoids duplicate Core-owned `id="comments"` anchors. One approved and one pending comment verify approval boundaries; a second approved comment must update the native count label. The classic Slateframe comments template must not also render when a post already contains `core/comments`, legacy `core/post-comments` or `core/post-comments-form`. The native comments anchor must remain unique. All fixtures are deleted in `finally`.

The real WordPress/Chromium fixture checks 320/375/390/412/768/1440/1920px, LTR/RTL, long CJK/Arabic and unbroken headings, 200%/400% text, semantic headings, Axe WCAG 2.1 AA, keyboard flow, forced colors, exact-SHA screenshots and conditional 404 asset isolation. Authenticated Gutenberg checks Core title/count attributes and stable serialization without modifying the editor document.

Review exact-HEAD Actions artifacts, WordPress/PHP compatibility and reproducible WordPress.org ZIP before merging. Safari/VoiceOver and Firefox localized heading announcements remain manual release checks. WordPress 6.7+ native Comments block behavior is preserved; Slateframe does not polyfill Core.
