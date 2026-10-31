# Attachment discussion ownership

WordPress attachments may contain native `core/comments`, `core/post-comments`, or `core/post-comments-form` blocks in authored content. Slateframe must not append a second classic `comments_template()` when a native Core discussion block already owns the markup.

The attachment template now follows the same Core-first boundary as the post and page templates. The classic fallback remains available for attachments without Core discussion blocks, including historical comments when comments are closed. No comment processing, moderation, storage, JavaScript, CSS, or remote service is added.

`tests/test_attachment_comments_core_ownership.py` executes the actual attachment template with isolated PHP WordPress stubs across nine open/closed/block combinations. The normal real WordPress browser suite and exact-HEAD CI still gate integration; this isolated test alone does not prove visual acceptance.

The fix is presentation-only. Keep WordPress Core markup, user-authored content, RTL/CJK, Appearance, 44px controls, and all existing asset budgets unchanged.
