# Knowledge checkpoint at 400% text enlargement

The native `slateframe/knowledge-checklist` pattern uses WordPress Core Group, Columns, Heading, List and Quote blocks. Its checkpoint columns previously used `clamp(1rem,2.5vw,1.5rem)`, consuming 64px of block padding at a 64px root font. The shared presentation rule now uses `min(1rem,20px)`: 16px at normal size and at most 20px under 200–400% enlargement, without reducing the text size.

The existing 781px Core Columns mobile stack, logical zero-inline-padding override, author-controlled `is-not-stacked-on-mobile` and Gutenberg controls remain intact. No new runtime assets, JS, dependencies or business logic are added. The 7,000-byte `content-modes.css` limit is unchanged.

Real WordPress/Chromium acceptance covers seven widths (320/375/390/412/768/1440/1920), both text directions, 16/32/64px roots, computed logical padding, Core list entries, no horizontal overflow, Axe WCAG 2.1 AA in forced colors, 390px RTL/400% and 1440px LTR screenshots, and authenticated Gutenberg block validity. The exact PR HEAD's successful Actions and actual images are required before merge.
