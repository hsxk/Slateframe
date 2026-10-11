# Contextual presentation in footer widgets

Slateframe's optional `footer-content` region accepts native Core blocks, Classic Text and Custom HTML widgets. A footer can appear on archives, searches, and 404 pages as well as singular posts; it must not depend on a post-specific `reading.css` enqueue.

## Asset detection

`slateframe_footer_widget_sources()` inspects only **active** footer widgets once per request. The same normalized sources feed form and presentation discovery; no second widget traversal, block rendering, shortcode execution, or plugin-specific routing is needed. Core Block widgets retain their block type, while Classic Text/HTML widgets are inspected as HTML only, so a literal Gutenberg comment in classic text cannot masquerade as an active block.

Exact HTML class tokens and dynamic Gutenberg `className` attributes opt in to Photography, Portfolio/Knowledge, and Query Loop styles. Core Image/Gallery lightbox settings also opt in to Photography. Nested `core/block` references are resolved only when their `wp_block` post is published, with the existing bounded, cycle-safe traversal. Inactive widgets, drafts, non-`wp_block` references, incidental prose mentioning a marker, and near-match class names must not enqueue contextual CSS.

The singular and footer paths share `slateframe_photography_marker_classes()`, `slateframe_content_mode_marker_classes()`, and `slateframe_query_loop_marker_classes()`; these retain the existing `slateframe_photography_markers`, `slateframe_content_mode_markers`, and `slateframe_query_loop_markers` extension filters. On archive routes, contextual styles depend on `slateframe-style`; singular routes retain `slateframe-reading` dependencies. Form-content and search-form styles always have their shared form-control dependency, even if third-party filters disagree.

## Layout

The footer's optional widget region is a responsive grid. A Query Loop placed inside a footer widget uses a single-column post template even at a wide desktop viewport, where its parent widget column may be only about 14rem wide. The regular main-content Portfolio grid retains its three/two/one-column responsive behavior. This is a footer-context presentation rule, not a custom post type or Query Loop replacement.

## Validation

Run the isolated PHP contracts (`python3 -m unittest discover -s tests -p 'test_*.py'`) and the real WordPress/Chromium Playwright footer fixture. The latter runs once per CI browser matrix, captures 390px and 1440px footer screenshots, verifies actual one-column card placement, and checks that contextual assets disappear when the widget is removed. The isolated contracts also exercise shared Search/Classic/synced-pattern sources, archive CSS dependency closure, and the 3,000-byte Query Loop stylesheet budget. A passing isolated contract is **not** a substitute for exact-commit Actions and visual inspection.