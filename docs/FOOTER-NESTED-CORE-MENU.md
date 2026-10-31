# Native hierarchical footer navigation

Slateframe's footer uses the WordPress Core `wp_nav_menu()` Walker and its assigned `footer` menu location. Previously `depth => 1` silently suppressed every child item. `depth => 0` preserves the complete authored hierarchy without introducing a theme-owned menu data model, script, or disclosure system.

Core-generated nested `ul.sub-menu` lists remain visible. Logical inline indentation supports LTR/RTL, and the existing 44px target and wrapping rules apply to links. CSS stays within the existing 2,000-byte footer budget. WordPress continues to own menu hierarchy, current-item classes, link text and URL sanitation.

## Verification

- Executable/static regression guards native Walker, unlimited depth, no fallback, logical indentation and CSS budget.
- Real WordPress/Chromium test creates a disposable three-level Core menu with WP-CLI, renders Core's HTML in the actual theme footer, and checks all seven standard widths, both directions, keyboard focus, 44px controls, RTL 400%, forced colors, Axe and horizontal overflow.
- Three exact-HEAD screenshots (390px RTL 400%, forced colors, 1440px LTR) must be generated, downloaded and visually reviewed before merging.
- No new runtime JavaScript, plugin, external dependency, legacy branding or production-site access.

This is a theme presentation change, not a replacement for WordPress Core navigation.
