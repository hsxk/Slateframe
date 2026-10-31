# Attachment discussion ownership

WordPress attachments may contain native `core/comments`, `core/post-comments`, or `core/post-comments-form` blocks in authored content. Slateframe must not append a second classic `comments_template()` when a native Core discussion block already owns the markup.

The attachment template now follows the same Core-first boundary as the post and page templates. The classic fallback remains available for attachments without Core discussion blocks, including historical comments when comments are closed. No comment processing, moderation, storage, JavaScript, CSS, or remote service is added.

`tests/test_attachment_comments_core_ownership.py` executes the actual attachment template with isolated PHP WordPress stubs across nine open/closed/block combinations. The normal real WordPress browser suite and exact-HEAD CI still gate integration; this isolated test alone does not prove visual acceptance.

The fix is presentation-only. Keep WordPress Core markup, user-authored content, RTL/CJK, Appearance, 44px controls, and all existing asset budgets unchanged.

The real WordPress browser test also creates an approved historical comment on a classic attachment, closes comments, and verifies that the comment remains visible without a submit form. It checks 390px RTL at 400% text zoom, forced colors, 1440px LTR, Axe, and exact-HEAD screenshots. The fixture is deleted after testing.

## Published synced patterns

WordPress `has_block()` inspects the stored post but does not follow a `core/block` synced-pattern reference. If an author inserts a published synced pattern containing Core Comments or Post Comments Form, its native form renders inside the article and a separate classic form must not be appended. The shared `slateframe_has_core_discussion_block()` helper covers posts, pages and attachments. It reuses the existing published-only, cycle-safe, eight-reference Core pattern resolver without rendering arbitrary blocks, running shortcodes, or changing comment storage. Password-locked content, unrelated patterns and classic discussion retain Core's normal fallback behavior.

`tests/test_synced_comments_ownership.py` executes 14 direct/synced/locked/invalid-context PHP cases. `tests/browser/synced-comments-ownership.spec.js` creates a disposable published `wp_block` and real post, page and attachment, checking that exactly one native form appears at seven widths in LTR/RTL, plus 390px RTL 400%, Axe, forced colors and 1440px screenshots. GitHub Actions requires the exact-HEAD screenshots before acceptance.
