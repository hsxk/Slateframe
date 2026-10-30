# Native page-menu fallback

Slateframe uses WordPress Core `wp_nav_menu()` for assigned menus. Without an
assigned primary menu, the theme relies on native `wp_list_pages()` and does
not register custom navigation data or require a plugin.

When **Settings → Reading → Your homepage displays** uses **latest posts**,
the fallback adds a translated Home link to the site root. That link receives
`aria-current="page"` only when `is_front_page()` is true.

When Reading uses a valid **static front page**, the fallback **does not add a
second Home link**. Instead it retains the complete native Core page list,
including the static front page and its descendants. WordPress
`Walker_Page` supplies `aria-current="page"` for the active static page.
This is important: excluding the parent page from `wp_list_pages()` can
orphan nested child pages in the hierarchical walker. A separately configured
posts page also remains available in the Core list.

The theme uses its existing strict positive-ID parser only to recognize a
valid static-front-page configuration. If that option is malformed, the
fallback keeps the explicit Home link rather than silently hiding a route.
The markup preserves `slateframe-menu-fallback`, native `page_item`
classes, RTL/CJK and the existing responsive header. No new CSS or JS.

Regression: `python3 -m unittest discover -s tests -p "test_*.py"`
includes six PHP-backed cases for posts/static front pages, Core current
state, retained child hierarchy, separate posts index, malformed IDs and
the original list shape. These isolated Core API stubs are not a substitute
for the exact-HEAD real WordPress browser and compatibility gates.
