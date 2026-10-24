# Native navigation intrinsic width

The desktop menu includes native WordPress navigation and optional language
links. Summing anchor widths using the header gap overestimates the menu's
actual width and prematurely switches a fitting desktop menu to compact mode.

Slateframe temporarily measures the complete non-compact nav box at
max-content width. This includes real menu/language gaps but excludes the
absolutely positioned submenu flyouts. The script restores the previous
inline style and compact class before transitioning. The 1280px breakpoint,
zoom cutoff, inert disclosure, IME-safe Escape and focus restoration remain.

The real WordPress browser regression checks 1440/1920px LTR/RTL,
non-overlap, submenu visibility, changing labels, 400% zoom, keyboard
Escape and screenshot evidence. Existing mobile navigation tests remain.
No new dependency, plugin integration or production deployment.
