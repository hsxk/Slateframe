# Native Core Post Terms parity

Slateframe preserves WordPress Core's post-term taxonomy queries, links, separators, accessible names, and editor serialization. This is presentation only: no taxonomy registration, custom term ordering, custom query, plugin requirement, or JavaScript.

## Contract

- The `core/post-terms` block retains the authored `term` taxonomy (`post_tag` or `category`). Its native term links and separators remain intact.
- Only pages rendering this block load `assets/css/core-post-terms.css`; Gutenberg shares the same CSS. Each term link receives a logical minimum 44px target without overriding Core colors or focus treatment.
- CJK, Arabic, and unbroken term names reflow at 320, 375, 390, 412, 768, 1440, and 1920px, in both directions, at normal, 200%, and 400% root font sizes. Separators remain ordinary text, not independent interactive targets.
- A disposable WordPress post with native category and tag assignments verifies Core URLs, both taxonomy modes, keyboard focus, Axe, forced colors, navigation, screenshots, and no CSS on an unrelated 404 page.
- Authenticated Gutenberg serialization tests both taxonomy variants without changing the editor's existing document. Fixture terms and post are deleted in `finally`.

## Release review

Inspect exact-SHA real WordPress/Chromium screenshots, then manually review Safari/VoiceOver and Firefox term-link announcements and localization. Automated tests do not establish those manual outcomes.
