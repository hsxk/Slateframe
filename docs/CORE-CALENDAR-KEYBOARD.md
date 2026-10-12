# Core Calendar: keyboard scroll containment

Slateframe keeps the native WordPress Core Calendar markup and table semantics. At narrow widths, RTL, or increased text size, the calendar's `.wp-block-calendar` wrapper is the horizontal scroll owner; the document must not grow wider than its viewport.

The theme's `render_block_core/calendar` presentation filter adds `tabindex="0"` **only when absent**. It does not modify the table, dates, links, headings, or authored tabindex. The existing focus-visible token supplies a visible focus ring, including in forced-colors mode. This is a presentation/accessibility enhancement rather than a calendar replacement.

`tests/browser/core-calendar-keyboard.spec.js` creates a real published Core Calendar block in an isolated WP-CLI fixture, then removes the fixture in `finally`. It checks focus and arrow-key horizontal scrolling at 320/375/390/412px, containment at 768/1440/1920px, LTR/RTL, and 200% text zoom with forced colors. The test emits a screenshot of the 390px RTL zoomed state. The existing Calendar localization and containment suites remain unchanged.

**Release gate:** run the new test against real WordPress and Chromium, review its screenshot, and confirm the same exact commit passes all required workflows before merging. Static checks and PHP lint alone are not acceptance evidence.
