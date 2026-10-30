# Native page-menu fallback

Slateframe uses WordPress Core `wp_nav_menu()` for assigned menus. On a fresh
installation without an assigned primary menu, the theme renders a native
`wp_list_pages()` list and a single site-root Home link. It does not register
custom navigation data or require a plugin.

When **Settings → Reading → Your homepage displays** is set to a static page,
the fallback excludes only that front-page ID from `wp_list_pages()`, because
the separate Home link already leads to it. Other published pages, including
a separately assigned posts page, remain in Core's page list. The exclusion
uses the existing strict positive-ID parser to avoid excluding an unrelated
page if an option is malformed.

The Home link has `aria-current="page"` only when WordPress
`is_front_page()` is true. This covers both the default posts front page
and a static front page, without incorrectly marking Home current on a
separate posts index, archive, or article. WordPress continues to determine
the active state of all other page links.

The markup keeps the existing `slateframe-menu-fallback`,
`slateframe-home-link` and `page_item` classes, the responsive header,
keyboard behavior, translations and RTL styling. No new CSS or JavaScript is
required.

Regression: `python3 -m unittest tests/test_menu_fallback_semantics.py`
(or the existing full Python test discovery) runs isolated PHP mocks for
static/posts home, separate blog index, malformed front-page IDs and the
original list shape. This test verifies the theme function and expected
WordPress API arguments; it does not replace a real WordPress browser review.
