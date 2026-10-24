# Core File: embedded PDF preview before filename

WordPress Core File may render an `<object class="wp-block-file__embed">` before its filename anchor when PDF preview is enabled. A direct-child `a:first-child` selector therefore misses the filename in this valid native configuration. The presentation selector is now `a:first-of-type`, which selects the first direct anchor even when the object comes first, without styling the second Download button as a filename.

The shared selector applies to both `.slateframe-prose` and `.editor-styles-wrapper`; the Download button keeps its existing Core styling and 44px geometry. The regression adds a real browser fixture with the object preceding two links and checks all seven supported widths, LTR/RTL, forced colors, 200% text zoom, keyboard focus, and no page overflow. It emits a 390px RTL screenshot for review.

This is a targeted fix for the open review on PR #48. It introduces no new JavaScript, plugin dependency, translation string, or relaxed budget.
