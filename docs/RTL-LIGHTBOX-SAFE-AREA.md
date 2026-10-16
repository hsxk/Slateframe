# Native WordPress Core Lightbox: RTL and safe-area presentation

Slateframe keeps Core's dialog, navigation, keyboard handling, image selection, and focus restoration. No custom lightbox JavaScript is added.

- **Close control:** Core positions the close button using physical `right` and already includes top/right safe-area insets. Slateframe adds only its component gap in LTR. In RTL, the button is anchored to the physical left with `safe-area-inset-left`, and the inherited logical-end margin is reset. Never double-count Core's top safe area.
- **Gallery navigation:** Below Core's 960px breakpoint, previous/next buttons retain Core's spacing token and also respect `safe-area-inset-bottom`. At 960px and above, Core's vertically centered controls remain unchanged.
- **Gallery CSS:** Reuse the existing gallery style selector, preserving the 6000-byte Photography CSS budget.
- **Evidence:** Real WordPress and Chromium must test both directions at 320/375/390/412/768/1440/1920, 44px targets, Escape/focus restoration, Gallery navigation, and the 959/960 boundary. Representative screenshots must be tied to the exact Actions SHA.

Do not mark this change production validated until Theme quality and Photography Actions pass for the new HEAD and the real WordPress screenshots have been inspected.
