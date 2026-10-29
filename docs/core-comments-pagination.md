# Native Core Comments Pagination

Slateframe styles WordPress Core's Comments Pagination block; it does not create comment queries, change comment ordering, override pagination URLs, translate labels, or add JavaScript. Core supplies the navigation landmark, current-page state and authored block layout.

The conditional `core/comments-pagination` stylesheet shares `--slateframe-control` (44px minimum) with the editor and public pages. Previous/next links and page-number anchors remain keyboard operable, with logical sizing, CJK/RTL wrapping, 200%/400% text reflow and a forced-colors outline for the active page. The current-page span remains non-interactive.

A disposable real WordPress Page checks Core's server-rendered `<nav>`, link targets, accessible name, seven widths, RTL, keyboard focus, Axe, forced colors, screenshots and 404 stylesheet isolation. Gutenberg serialization is separately verified with Core's native pagination child blocks. The fixture intentionally supplies deterministic sample links rather than mutating global `comments_per_page` options in a shared parallel CI site. Before release, manually verify real paginated comment threads and localized announcements in Safari/VoiceOver and Firefox.

## Print boundary

The conditionally loaded Core Comments Pagination stylesheet now hides only the native navigation wrapper in print media. The comment text, authored article content and surrounding discussion remain under WordPress control. A real WordPress disposable-page test checks that 400% RTL print hides the navigation, preserves its content, and restores visible controls on screen; exact-HEAD CI requires a 390×900 screenshot. At 400% text zoom, the capture scrolls the authored discussion into the viewport and asserts its actual bounding rectangle; a title-only screenshot is not accepted as evidence of printed comment readability. The nested selector preserves the existing 44px touch targets, active-page emphasis and forced-colors behavior without raising the 550-byte CSS budget.

The screenshot gate validates the complete PNG stream (IHDR dimensions, chunk CRCs, IDAT and IEND) and rejects symlinked evidence, rather than treating a nonempty file as proof. This Core block fixture is distinct from the theme's classic `.slateframe-comments` template, which remains intentionally omitted by the global article-print stylesheet; it does not establish that classic comment threads are printed.
