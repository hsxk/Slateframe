# Current-post discussion ownership inside Core Query Loop

WordPress Core's Post Template changes the `postId` context for repeated posts. A `core/post-comments-form` or `core/comments` block inside that template belongs to the queried post, not automatically to the singular article containing the Query Loop. A blanket `has_block()` check on the outer article can wrongly suppress its classic discussion.

Slateframe preserves Core's rendering and queries. Its presentation-only ownership check excludes `core/post-template` descendants when deciding whether the *outer* singular needs the classic comments template, but still recognizes Core discussion in other children of `core/query`, direct content, nested Group/Columns, and published synced patterns outside the repeated-post context.

The existing fast path stays intact when no Query Loop or Post Template context boundary exists. The context-aware path parses Core blocks without rendering them or running shortcodes, and follows only published `wp_block` references, with cycle protection, an eight-reference depth limit, strict numeric IDs and no external requests.

The isolated PHP regression exercises 12 scenarios: Query Loop only, Query Loop plus own form, Query Loop sibling form, nested Group, published synced form, synced under Query Loop, Query Loop inside synced, mixed synced, draft reference, cycle, nested synced, and overflowing reference ID. Real WordPress/Chromium coverage checks direct and synced Query Loop content at 320/375/390/412/768/1440/1920, LTR/RTL, 390px RTL 400%, 1440px LTR, Axe, forced colors and seven exact-SHA screenshots. Existing WPCS, Theme Check, WP/PHP compatibility, asset budgets and package rules are unchanged.

WordPress Core references: [Post Template](https://developer.wordpress.org/block-editor/reference-guides/core-blocks/core-blocks-theme/core-block-post-template/) supplies the repeated post context; [Post Comments Form](https://developer.wordpress.org/block-editor/reference-guides/core-blocks/core-blocks-theme/core-block-post-comments-form/) consumes `postId`/`postType`. The Query Loop container itself does not supply a replacement `postId`.
