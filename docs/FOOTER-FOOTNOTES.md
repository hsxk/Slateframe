# Footer Core Footnotes numbering

Footer widgets must preserve WordPress Core Footnotes ordered-list numbering and nested Core List markers. Only navigation and utility lists should be unmarked; this change extends the existing Core List exemption without changing the footer grid or adding JavaScript.

The browser regression checks seven widths, LTR/RTL, 200% text size, forced colors, focus, minimum navigation targets and overflow. Real WordPress/Chromium Actions and same-SHA screenshots are required before merging. Plain HTML lists in classic text widgets remain a separate presentation audit item.
