# Native Core Page List parity

Slateframe preserves WordPress Core's published Page query, hierarchy, URLs, Navigation integration, and dynamic renderer. No custom content model, JavaScript, or site-specific data is added.

A conditional stylesheet, shared with Gutenberg via `add_editor_style()`, contains nested lists and supplies 44px logical link targets. Japanese, Chinese, Arabic, and unbroken page titles must reflow at 320/375/390/412/768/1440/1920px, LTR/RTL and 200%/400% text without horizontal overflow.

## Real WordPress acceptance

A disposable fixture creates a published parent/child/grandchild and an unpublished draft, renders a standalone `core/page-list` alongside a native Navigation Link, verifies exact links and hierarchy, and exercises keyboard focus, Axe, forced colors, screenshot evidence, navigation and 404 conditional-asset isolation. Every Page is deleted in `finally`. Authenticated Gutenberg verifies non-destructive block parse/serialize. The CSS budget is 500 bytes and the distribution manifest includes the new asset.

Manual Safari/VoiceOver and Firefox deep-hierarchy announcement review remains open. Visual approval requires downloading and actually inspecting exact-SHA WordPress/Chromium screenshots.

## Core Navigation list semantics (2026-10-25)

Real WordPress/Chromium Axe on PR #115 exposed a serious `list` violation when a `core/page-list` block was inserted directly inside `core/navigation`: Core emitted `<ul class="wp-block-navigation__container"><ul class="wp-block-page-list">…</ul></ul>`, where a `ul` cannot be a direct child of another `ul`. This is a fixture composition error, not a CSS failure. Do not suppress Axe, add ARIA roles to disguise the invalid list, or introduce a theme-owned render filter to rewrite Core markup. The corrected fixture tests the dynamic Page List as a standalone block and the native Navigation Link in its own `<li>`; Axe still covers **both**. Native Page List hierarchy, draft exclusion, URLs, seven widths, RTL, zoom, focus, forced colors and Gutenberg roundtrip remain asserted. A separate Core Navigation suite covers native responsive overlays and long labels. WordPress Core should own any future fix for directly nested Page List/Navigation markup.
