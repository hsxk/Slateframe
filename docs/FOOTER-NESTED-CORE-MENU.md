# Native hierarchical footer navigation

Slateframe's footer uses the WordPress Core `wp_nav_menu()` Walker and its assigned `footer` menu location. Previously `depth => 1` silently suppressed every child item. `depth => 0` preserves the complete authored hierarchy without introducing a theme-owned menu data model, script, or disclosure system.

Core-generated nested `ul.sub-menu` lists remain visible with browser-native list markers and logical LTR/RTL indentation. Existing global overflow wrapping and 44px footer-link target rules apply. The footer stylesheet remains byte-for-byte unchanged at its previous 1,865-byte budget, avoiding regressions in the stricter aggregate CSS+JS envelopes. WordPress continues to own menu hierarchy, current-item classes, link text and URL sanitation.

## Verification

- Executable/static regression guards native Walker, unlimited depth, no fallback, native list semantics and unchanged CSS budget.
- Real WordPress/Chromium test creates a disposable three-level Core menu with WP-CLI, then executes the actual `footer.php` in a separate WP-CLI process with an ephemeral `theme_mod_nav_menu_locations` filter. The real template's rendered nav is placed in the browser footer for seven-width LTR/RTL, keyboard, 44px, 400%, forced-colors, Axe and overflow checks. The test does not assign a site-wide menu or reimplement the template's `wp_nav_menu()` options, avoiding both false-positive integration tests and cross-test state changes.
- Three exact-HEAD screenshots (390px RTL 400%, forced colors, 1440px LTR) must be generated, downloaded and visually reviewed before merging.
- No new runtime JavaScript, plugin, external dependency, legacy branding or production-site access.

This is a theme presentation change, not a replacement for WordPress Core navigation.
