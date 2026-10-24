# Core List semantics for markerless Knowledge styles

Slateframe's native **Numbered steps** and **Editorial checklist** styles intentionally suppress the browser's default list marker to draw a numbered badge or checkmark. In Safari with VoiceOver, `list-style: none` can cause an ordinary HTML list to lose its list announcement even though the underlying `ol`/`ul` and `li` elements remain intact.

The `render_block_core/list` presentation filter restores `role="list"` on the root Core List only when it has the exact `is-style-slateframe-steps` or `is-style-slateframe-checklist` class. It does not change the saved Gutenberg block, ordinary lists, nested lists, plugin output, or lookalike class substrings. An author-supplied `role` is never overwritten. No JavaScript, plugin dependency, custom block, post type, or content migration is required.

This is a narrow semantic fallback, not an attempt to replace native list behavior. The authored Core List and nested bullets/numbering remain visible and editable in Gutenberg. A native list still conveys item count and navigation to assistive technology when its visual marker is replaced by Slateframe.

## Regression acceptance

`tests/browser/core-list-semantics.spec.js` exercises the actual WordPress render filter with styled and unstyled lists, nested markers, explicit author roles, non-list impostors, and exact class matching. Its disposable real WordPress page checks 320/375/390/412/768/1440/1920px in LTR/RTL, nested native markers, focus, 200% text zoom, forced colors, Axe WCAG A/AA, and two screenshot artifacts.

The existing `knowledge-nested-lists.spec.js` and Gutenberg editor tests continue to own block flow, nested authoring, and editor parity. An automated Axe pass cannot substitute for manual Safari/VoiceOver announcement review. Before merging, require all necessary Actions for the exact HEAD SHA, inspect the real WordPress/Chromium screenshots, and verify the resulting main SHA.

This change stays within Slateframe's presentation/accessibility boundary; it never touches production sites or WordPress content ownership.
