# Native Core Categories presentation

Slateframe retains WordPress Core's `core/categories` taxonomy queries,
category archive URLs, post counts, nested hierarchy, dropdown options and
navigation. No custom taxonomy, block renderer, script or plugin is required.

A conditional stylesheet capped at 550 bytes provides logical containment,
44px interactive link/select targets and long CJK/Arabic label wrapping.
Core retains nested-list semantics, indentation and select behavior.
Gutenberg receives the same stylesheet through `add_editor_style()`.

## Automated acceptance

A disposable WordPress fixture creates two real parent/child categories and
posts, then renders native list and dropdown blocks. The browser verifies
Core archive URLs, nested hierarchy, dropdown options, conditional assets,
320/375/390/412/768/1440/1920px × LTR/RTL × computed 16/32/64px
root text (42 cases), 44px bounded controls, keyboard, forced-colors and Axe.
Existing full-page screenshots remain at 320/390/1440 LTR/RTL and 390 RTL
200% forced colors. Three additional **real WordPress/Chromium 390×900 viewport**
screenshots at 400% (LTR, RTL, RTL forced colors) must show the focused native
select after scrolling it into view. CI rejects missing, corrupt, wrong-size,
linked and truncated PNG evidence; CSS, Core navigation and Gutenberg markup
remain unchanged. An unrelated 404 must not load the asset.
Cleanup is in `finally`. Authenticated Gutenberg serialization checks
both display modes without modifying the editor post.

Manual Safari/VoiceOver and Firefox dropdown interaction, announcement of
nested counts and plugin coexistence remain open. Require exact-SHA Actions
and real WordPress/Chromium screenshot inspection before merging.

WordPress Core intentionally includes existing nonempty categories alongside the
fixture. The test requires both exact authored category URLs and the nested
child, while validating all rendered links rather than assuming only two
categories exist. WP-CLI term assignment uses slugs: numeric arguments are
interpreted as new category names and must never be used as term IDs here.

The native Core dropdown uses **term slugs** as option values (not numeric IDs), and its `category_name` change handler performs navigation. The browser fixture asserts exact parent/child slugs and exercises a real selection to ensure Core behavior is preserved.

Core's default footer widget can render Categories even on a genuine 404, so the conditional stylesheet must be present on that route when the widget is present. The browser now verifies this positive case, temporarily removes only the disposable `footer-content` sidebar assignments, reloads the same 404 to prove the asset is absent without any Categories block, and restores the exact `sidebars_widgets` option in `finally`. This tests real block-based asset isolation without assuming a widget-free footer.
