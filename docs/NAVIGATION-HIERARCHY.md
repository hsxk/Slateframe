# Native WordPress menu depth and nested navigation

Slateframe uses the WordPress Core menu walker and does not replace menu storage, link targets, ordering, or keyboard behavior with a theme-specific menu component. A configured menu can contain more than two levels; limiting `wp_nav_menu()` to depth two silently omitted legitimate third-level links even though WordPress Core stores them. The primary menu therefore uses `depth => 0` (all authored levels). The unassigned page-menu fallback already preserves Core's page hierarchy.

## Presentation boundary

Desktop menus retain one bounded, scrollable first-level dropdown, not a cascading off-screen flyout. Third and deeper levels are rendered within that dropdown and receive a small logical start inset and border, making their hierarchy visible in both LTR and RTL. The compact disclosure retains its existing independently scrollable container, 44px links, Escape handling, focus behavior, and logical indentation. No new JavaScript, menu API, plugins, network calls, or custom walker are introduced.

## Acceptance

`tests/browser/navigation-deep-hierarchy.spec.js` exercises native WordPress menu classes with three levels in real WordPress/Chromium at 320, 375, 390, 412, 768, 1440 and 1920px, LTR/RTL, and 390px RTL forced colors. It requires the third-level link to remain visible and reachable through Tab, to have at least a 44px target, and not to cause document horizontal overflow. CI requires all corresponding screenshots at the exact PR HEAD. `tests/test_navigation_deep_hierarchy_contract.py` guards the Core walker depth, logical nested presentation and evidence test contract. WordPress/PHP compatibility, WPCS, Theme Check, static asset budgets, screenshot integrity and human visual review remain mandatory.
