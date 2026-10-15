# Long desktop navigation menus

Slateframe's Core menu hierarchy can contain many children. Previously the desktop
submenu was absolutely positioned with no block-size limit; on a short laptop
viewport, the final links fell below the visible page and keyboard users could
lose track of focus. The theme now caps the *submenu* to 70dvh and uses native
scrolling. No menu-specific JavaScript or custom keyboard behavior is added.

The existing compact/mobile navigation retains its separate scroll container,
Escape behavior, and 44px targets. The desktop rule is scoped to the noncompact
navigation and uses logical positioning, so RTL layouts use the same treatment.
The content and browser determine scrolling; no menu items are hidden or removed.

The new Playwright regression uses 25 nested links and checks real Tab movement,
scroll position, viewport containment, RTL, 320/390px compact navigation and
1440/1920px desktop navigation. Exact-SHA WordPress/Chromium screenshots and
Actions remain required before merging. The runtime CSS is kept inside the
existing static and combined Photography+Discussion budgets by eliminating two
computed-style-equivalent brand declarations; the theme budget is not raised.
