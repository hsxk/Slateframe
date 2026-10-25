# Native Core Tag Cloud parity

Slateframe styles the WordPress Core Tag Cloud block without querying terms, changing counts, rewriting URLs, flattening taxonomies, or replacing Gutenberg markup. Its tiny conditional stylesheet is shared with the editor and intentionally preserves Core's count-based font sizing.

## Contract

- Core generates term links, counts, tag weights, accessible names, and taxonomy semantics. Slateframe only provides logical-size and reflow presentation.
- Links retain variable Core font sizes and receive a minimum 44px logical target. Each link is an inline-block (not inline-flex) so WordPress's count label remains attached to its term, even for long multilingual labels. Long CJK, Arabic and unbroken labels must not overflow at 320–1920px in LTR or RTL.
- The stylesheet loads only with a rendered core/tag-cloud, including block widgets and synced patterns. It is not a global stylesheet or JavaScript feature.
- Disposable WordPress tags and categories with different post counts verify both native taxonomy modes, URLs, keyboard focus, Axe, forced-colors, 200%/400% text, screenshots, and authenticated Gutenberg round-trip serialization.
- The fixture deletes its temporary posts, tags, categories, and Page in finally. It never touches production content or a remote site.

## Manual release review

Inspect exact-SHA WordPress/Chromium screenshots, then review Safari/VoiceOver and Firefox for tag-count announcements, font-size contrast, keyboard focus, and localized tag labels. These manual checks are not replaced by Chromium or static assertions.
