# Native Core Comments Pagination

Slateframe styles WordPress Core's Comments Pagination block; it does not create comment queries, change comment ordering, override pagination URLs, translate labels, or add JavaScript. Core supplies the navigation landmark, current-page state and authored block layout.

The conditional `core/comments-pagination` stylesheet shares `--slateframe-control` (44px minimum) with the editor and public pages. Previous/next links and page-number anchors remain keyboard operable, with logical sizing, CJK/RTL wrapping, 200%/400% text reflow and a forced-colors outline for the active page. The current-page span remains non-interactive.

A disposable real WordPress Page checks Core's server-rendered `<nav>`, link targets, accessible name, seven widths, RTL, keyboard focus, Axe, forced colors, screenshots and 404 stylesheet isolation. Gutenberg serialization is separately verified with Core's native pagination child blocks. The fixture intentionally supplies deterministic sample links rather than mutating global `comments_per_page` options in a shared parallel CI site. Before release, manually verify real paginated comment threads and localized announcements in Safari/VoiceOver and Firefox.
