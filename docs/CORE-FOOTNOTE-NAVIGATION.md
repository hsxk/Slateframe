# Native Core Footnote navigation

WordPress Core footnote references are inline reading links; they keep their native inline geometry. The return link in each ordered-list footnote is a separate action and receives the bounded Slateframe control target (minimum 44px). No JavaScript, custom block, or footnote content migration is required.

The target and its source reference (whether the Core reference ID is on a `sup` or `a`) use `scroll-margin-block-start` to avoid disappearing beneath the sticky header when followed by a native fragment URL. The current target receives a restrained outline, with a system `Highlight` outline under forced colors. The same controls apply to native Core Footnotes inside footer widgets without changing footer navigation lists. All rules also apply to the Gutenberg editing canvas through the existing shared `style.css` editor style.

The Playwright test injects only standard WordPress Core footnote markup into a real WordPress article, then exercises seven viewport widths, LTR/RTL, keyboard focus, 200% text zoom, forced colors, fragment navigation and screenshots. It must pass for the exact PR HEAD in Actions before merge; local fixture checks do not constitute production acceptance.

Browser verification must exercise native Tab → Enter return navigation, assert that the source target remains below the sticky header, and capture both the destination and source fragment states. Avoid duplicating the seven-width matrix in every Playwright project: representative touch and desktop projects each cover the complete responsive range.

The regression fixture explicitly checks both Core source-reference structures (`id` on `sup` and `id` on its anchor). Footer keyboard tests create their own source reference rather than depending on fixtures from another isolated Playwright test. CI uses `SLATEFRAME_POST_PATH` when available to load the actual published WordPress article.

Footer evidence uses representative 390px and 1440px browser projects to avoid redundant CI work. Its own source reference is keyboard-accessible, and forced-colors focus, fragment navigation, axe and screenshots are asserted in the same isolated test.

The existing authenticated Gutenberg browser suite now also injects a temporary native Core Footnotes structure into the real editor canvas, checks the bounded return target, inline source semantics, RTL, forced-colors focus, overflow and an editor screenshot. This DOM-only probe does not change or save the author's blocks.


## Long multilingual return labels at 400% text zoom

The scoped `overflow-wrap:normal` override for Core Footnotes links
prevented Slateframe's inherited `body{overflow-wrap:anywhere}` from
breaking a long unspaced, multilingual return label. Removing this
redundant override restores native wrapping without changing Core
footnote markup, default arrow labels, link target dimensions, print
rules, JavaScript or editor behavior. A replay of exact WordPress
HTML and CSS in isolated Chromium (not WordPress acceptance) found
16/42 overflow cases before and 0/42 after the correction, including
320px RTL at a computed 64px root. The real WordPress browser test
checks seven widths, both directions, 16/32/64px roots, 44px targets,
keyboard return navigation, forced-colors focus, Axe and three
mandatory 390x900 screenshots. The existing strict runtime budgets
are preserved; fresh exact-SHA Actions and visual review are required.
