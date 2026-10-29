# Native Core Comments thread presentation

Slateframe keeps WordPress Core in charge of comment approval, threading, authors, dates, replies, and Gutenberg serialization. When an authored \`core/comments\` block is rendered, a small conditional stylesheet provides responsive containment for its comment template, text and media, and link targets. The classic comments.php presentation remains unchanged.

The layout uses logical inline properties and the existing \`--slateframe-control\` minimum (44px by default) for author, date, edit, and reply links. Nested replies keep their Core structure with bounded mobile indentation. CJK/Arabic names and long identifiers wrap; code can scroll inside its own element. The editor receives the same stylesheet.

Real WordPress/Chromium tests create disposable approved, nested and pending comments; verify approved-only content; check 320/375/390/412/768/1440/1920px × LTR/RTL × 16/32/64px, focus, Axe, forced colors, native editor serialization, and complete exact-viewport screenshots at 390px RTL 400% and 1440px LTR. No JavaScript, custom comment query, moderation override, or plugin is introduced.
