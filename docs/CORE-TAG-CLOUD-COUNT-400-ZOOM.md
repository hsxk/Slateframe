# Native Core Tag Cloud count wrapping at 400% RTL

Slateframe preserves WordPress Core Tag Cloud markup, taxonomy links, inline per-term
font sizing, counts and Gutenberg serialization. No custom renderer or JavaScript.

## Reproduced root cause

A long count with white-space:nowrap at computed 64px font caused a 691px
document on a 320px Chromium viewport, in both LTR and RTL. Replacing it with
white-space:normal and overflow-wrap:anywhere contained the document to 320px.
The block asset remains 385 bytes, below its unchanged 400-byte budget.

Native counts remain inline. The browser test first verifies actual WordPress
term and category links and counts, then temporarily substitutes a 30-digit
count and 64px computed font in the rendered DOM (Core owns absolute term sizes).
At 320/390px RTL it checks containment, 44px targets, focus and forced colors.
It restores native content and style before navigation and keeps Gutenberg parity.
The exact 390x900 screenshot is required, with corruption and size regressions.
