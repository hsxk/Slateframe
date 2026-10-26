# Native Core Post Comments Form parity

Slateframe retains WordPress Core ownership of the comment form: comment submission, nonces, logged-in state, required fields, moderation, comment status, consent and native Gutenberg serialization. The theme adds only a conditionally enqueued editor-shared presentation stylesheet. No custom endpoints, database tables, JavaScript, plugin dependency or duplicate classic form are introduced.

## Scope and acceptance

- Bound the Core block and form paragraphs to the authored content column without viewport-width escapes.
- Keep native inputs and textareas within the column, including RTL/CJK long labels and optional login notices.
- Wrap cookie-consent controls and provide a bounded 44px cancel-reply target, preserving Core semantics.
- A disposable published WordPress post with only `core/post-comments-form` must render exactly one `#commentform` and no Slateframe classic fallback. Closing comments must remove the form.
- Verify seven widths (320/375/390/412/768/1440/1920px), RTL/LTR, 200%/400% text, keyboard, Axe, forced colors, exact-SHA screenshots, Gutenberg parse/serialize, and 404 conditional-asset isolation. Delete disposable fixtures in `finally`.
- Enforce an 850-byte CSS cap, inclusion in the distributable ZIP and editor styles, WPCS, Theme Check and existing reproducibility gates.

Manual Safari/VoiceOver and Firefox form announcements, localized validation, logged-in moderation states and password-manager behavior remain release-candidate acceptance items. Never send a real comment or touch a production site in the automated fixture.
