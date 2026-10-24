# Core Preformatted direction and Gutenberg parity

`core/preformatted` is not the same as `core/code`. Both retain monospaced, horizontally scrollable presentation, but only source code is forced LTR in an RTL document. Preformatted text can contain Arabic or other RTL prose and should inherit the document direction, like Core Verse. The editor already follows this distinction; `rtl.css` now aligns the published page.

The selector change is deliberately narrow: the existing `pre:not(.wp-block-verse)` rule in `assets/css/reading.css` still owns scrolling, so this change does not make long preformatted content overflow the viewport. The Code block's LTR behavior remains unchanged. A browser regression checks all seven supported widths, LTR/RTL, forced colors, 200% text zoom, and a real WordPress article container.

No JavaScript, locale detection, new translation strings, or extra stylesheet is introduced.
