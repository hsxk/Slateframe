# Core Knowledge list reflow

Slateframe's native ordered **Steps** list must remain a WordPress Core List, not a proprietary component. An `li` with anonymous text followed by Paragraph, nested List, and another Paragraph was previously a two-column CSS grid: later block children could auto-place into the narrow badge track. This especially harmed narrow CJK/RTL reading and enlarged text.

The badge is now positioned in the logical inline-start inset while the native list item retains ordinary block flow. Indentation consumes the existing `--slateframe-component-gap` token, the minimum block size reserves room for the badge, and the decimal digits keep their native order while the badge itself inherits RTL positioning. Nested Core lists retain their own markers. The first authored block has no artificial top gap. The Checklist checkmark and numbered badge use system text color under forced colors. No new JavaScript, custom block, post type, content migration, or new stylesheet request is introduced.

The real WordPress browser regression creates and removes a temporary page, checks all seven viewport widths in both directions, verifies alignment and document containment, and captures 1440px and 390px/RTL/200%/forced-colors screenshots. It also checks the print counter and native nested markers. The contextual CSS remains within its existing 7000-byte budget; no threshold is raised.

Gutenberg parity also reserves the same logical inline-start badge gutter in Core List editing markup at narrow RTL widths. The editor-specific rule consumes the existing component-gap token and does not change the frontend list or add runtime JavaScript. The authenticated 390/1440px editor test now measures the gutter against the native numbered badge before recording Knowledge screenshots; visual review remains mandatory. The badge's logical start inset must resolve to the same physical edge as the list item's logical start padding; inheriting direction on the pseudo-element prevents an RTL number badge from occupying the opposite edge and overlapping the first line.


## Bounded 400% numbered badge and gutter

The original 2.15rem badge consumed roughly 138px at a 64px root font before
the component gap. At 320px this left a very narrow text column and made long
CJK/RTL instructional steps unnecessarily tall. The Core List content, order,
nested native bullets and counters were correct; this was a presentation issue.

The list item now shares one logical --slateframe-step dimension between its
badge, minimum block size and inline-start gutter. The first bounded implementation used
max(var(--slateframe-control), 1.3rem), retaining the 44px Appearance floor
while allowing two-digit counters to grow with 400% text. The later compact
400% revision below adds a 64px ceiling without reducing the counter text. Using rem rather
than em is important: the badge's .72rem font size otherwise makes its
custom-property dimensions resolve differently from the list item's padding.
No text is truncated, clipped or reduced, and no JavaScript or new block is
introduced. The existing conditional content-modes.css remains under 7000
bytes and is shared with Gutenberg. The editor's higher-specificity Core List
padding override also consumes --slateframe-step (not the old 2.15rem),
preventing overlap when Appearance raises the control size to 56px. The
editor stylesheet retains its existing 5000-byte budget.

An independent isolated Chromium layout probe (not WordPress acceptance)
using the actual .75rem component gap at 320px / 64px root text showed
the first long step height changing from about 8062px to 5090px; at
390px, from about 4759px to 4209px. The exact
height depends on font metrics and authored content, so this is evidence of
the mechanism, not a cross-browser guarantee.

The real WordPress Playwright suite verifies seven viewport widths, LTR/RTL,
computed 16/32/64px root sizes, logical badge alignment, native nested
list markers, document containment, forced colors and Axe. Three 390x900
viewport PNGs are mandatory (LTR/RTL 400%, RTL forced colors). CI validates
their PNG signature, full chunk CRC chain, dimensions, image data and end
marker; missing or malformed captures block release. Visual acceptance
requires downloading and reviewing those screenshots for the exact PR SHA.


## 400% nested-list cascade correction

The real WordPress/Chromium Browser smoke at `4df26a99` found 53px of
horizontal document overflow at 320px LTR with a 64px root. The global
reading rule for all Core lists had greater selector specificity than the
Steps and Checklist styles' `padding-inline-start:0`, reintroducing an
86.4px outer indent. That consumed the nested list's remaining inline
space even after bounding the numbered badge. The shared reading selector
now excludes only those two explicitly unindented Core List styles; native
nested list padding, bullets, counters, RTL direction and Gutenberg parity
remain intact. The browser test asserts both computed zero indents as well
as seven-width containment. An isolated Chromium replay of the exact
failure trace (not release acceptance) reduced four 400% mobile overflow
cases to zero across 42 width/direction/scale combinations. The shared
reading stylesheet remains under its unchanged 7000-byte limit. Fresh
exact-HEAD Actions and screenshot review are required before merge.

## Full-width scale and evidence provenance

The Knowledge Steps browser matrix exercises **all seven** responsive widths in
both writing directions at computed 16/32/64px root text, including desktop
400% reflow. It asserts nested Core List geometry and the computed badge font,
not only the CSS token value. The screenshot verifier rejects symlinked evidence
as well as missing, corrupt, incomplete or incorrectly sized PNGs. These checks
are regression guards; only real WordPress/Chromium Actions at the exact commit
SHA and downloaded visual review establish release acceptance.


## Core Query Loop coexistence after the Steps reset

The real WordPress Browser smoke at PR #172 SHA `589446e` exposed a separate cascade regression in a disposable shortcode-generated Portfolio Query Loop: at 320px LTR / 32px root the native `.wp-block-post-template` acquired 43.2px of unwanted inline-start padding. The Steps/Checklist exclusion had introduced a high-specificity `:not(...)` into the generic reading list selector, allowing it to outrank the contextual Query Loop's deliberate `padding-inline:0` reset. This is a runtime presentation defect, not an acceptable test exception.

The reading selector now uses `:not(:where(.is-style-slateframe-steps,.is-style-slateframe-checklist))`. The `:where()` zeroes the exclusion's specificity while retaining both exclusions and ordinary/nested Core List indentation. The contextual `.slateframe-project-grid .wp-block-post-template` reset therefore wins normally; no `!important`, new dependency, business logic, or budget increase is required. Isolated Chromium computed-style checks found zero padding for plugin Query Loops and Steps/Checklist, while ordinary and nested lists retained 1.35em. This local reproduction is not WordPress acceptance. The plugin coexistence browser suite now also checks the actual 16px baseline and 64px RTL padding. Only fresh exact-HEAD Actions, real WordPress screenshots and ZIP verification can authorize merge.

## Compact 400% badge and text gutter

The Core Steps counter previously grew to 83.2px at a 64px root font, with a further 48px component gap before the first word. At 390px RTL/400%, that consumed 131.2px of the reading column even before the authored text. The shared `--slateframe-step` now uses `clamp(var(--slateframe-control),1.3rem,64px)`, preserving the Appearance 44–56px control floor and enough space for the native two-digit counter while capping the badge at 64px. Its logical inline gap is independently bounded by `min(var(--slateframe-component-gap),20px)` in both frontend and Gutenberg. The ordinary 16px baseline is unchanged; the 64px-root gutter becomes 84px instead of 131.2px. No font size, Core List structure, nested bullets, direction, or counter semantics are reduced or replaced.

An isolated Chromium preflight with the actual theme CSS exercised seven widths × two directions × three root sizes (42 states each before and after). It found no document overflow, and the long multilingual first step at 390px RTL/400% decreased from approximately 6,324px to 5,664px tall. These figures are diagnostic, not release acceptance. The real WordPress browser suite now asserts the badge ceiling and exact bounded gutter across the same matrix, plus keyboard/Axe, forced-colors and exact-HEAD screenshots. Both existing CSS byte budgets remain unchanged (7,000 and 5,000 bytes).

## Bounded native Checklist marker and text gutter at 400%

The native `core/list` Checklist style previously reserved `1.65rem` before each item. At a 64px root text size this became 105.6px, leaving an unnecessarily narrow multilingual reading column. The decorative checkmark also inherited the full enlarged text size. The logical item gutter now uses `min(1.65rem,36px)` and the pseudo-element marker uses `min(1em,24px)`; normal 16px text retains its original 26.4px gutter and 16px checkmark. Body text, authored content, nested Core List markers, RTL order and the Gutenberg block remain unchanged. At a 64px root the gutter is 36px, preserving 69.6px of reading width. The checkmark is decorative; it is not a replacement for text or semantic list structure.

The selectors still apply to both Core's `wp-block-list` class and older portable list markup. Only equivalent selector grouping for unrelated Knowledge/Portfolio rules was compacted to keep `content-modes.css` within the original 7,000-byte limit; there is no new stylesheet request or JavaScript. The WordPress browser regression checks seven widths, LTR/RTL and 16/32/64px root sizes (42 states), nested bullets, computed logical padding, forced-colors/Axe and four real screenshots. The authenticated Gutenberg regression checks the same bounded marker in the editor canvas. An isolated Chromium preflight of the proposed scoped CSS passed 42 combinations; it is not a substitute for exact-HEAD GitHub Actions and downloaded WordPress/Chromium screenshot review.


## Authored Core List start, reversed and type

The ordinary Knowledge Steps list keeps its circular 01/02 badges. Previously that custom counter also replaced an author's native numbering: start="98" still displayed 01, and reversed or alphabetic/Roman lists lost their authored order. On an ordered Steps list carrying start, reversed or type, Slateframe now hides only the custom badge and lets the browser's native list-item counter render the authored values. list-style-type:revert-layer preserves Core's decimal, alphabetic and Roman mapping; list-style-position:inside avoids a wide fixed gutter at 400% text zoom. The native marker retains the same .72rem proportional scaling as the normal badge, rather than shrinking counter text. Default Steps and nested list semantics are unchanged.

This uses existing reading.css and conditionally enqueued core-list.css, not a new runtime asset, custom block or JavaScript. The 7,000/350-byte budgets remain unchanged. The real WordPress regression checks seven widths, LTR/RTL, 16/32/64px text, Chromium accessibility-tree ordinal values (including three digits, implicit reversal and Roman/alphabetic numbering), forced colors, keyboard focus, Axe, print, Gutenberg validity and required exact-SHA screenshots. Isolated Chromium preflight passed 42 states; only fresh GitHub Actions and downloaded WordPress screenshots establish release acceptance.

Older CSS engines that do not understand revert-layer retain a preceding list-style-type:revert declaration, so the native ordered marker remains visible even when the authored alphabetic/Roman type cannot be fully restored. Modern engines use revert-layer to preserve the HTML type mapping.


### Authored Steps stylesheet budget (2026-10-30)

The native `start`, `reversed`, and `type` marker override now lives beside the existing Steps presentation in `content-modes.css`, which the theme enqueues for the `is-style-slateframe-steps` marker and mirrors in Gutenberg. The rule itself is unchanged; equivalent CSS selector groups were nested without changing their specificity or declarations. This keeps shared article/discussion and Photography runtime envelopes below the existing 38 KB / 43 KB caps without adding a request, relaxing a budget, or hiding native list semantics.

## Three-digit default Steps counters at 400% text enlargement

Default Core Steps lists with 100 or more items previously rendered three-digit CSS counters at 46.08px inside a 64px circle at 400% root text size. In Chromium the digits measured about 77px and crossed the circle even though the document did not horizontally overflow. This is distinct from explicitly authored `start`, `reversed` and `type` lists, which retain native Core markers.

Bound only the decorative counter font with `min(.72rem,24px)` while keeping the body text fully enlarged, the Appearance 44–56px control floor, 64px badge ceiling, logical RTL positioning, native list semantics and Gutenberg shared styles. At a 16px root the counter remains 11.52px; at 32px it remains 23.04px; at 64px it becomes 24px instead of 46.08px. The new real WordPress regression creates 101 native list items, checks seven widths × two directions × three root sizes, measures three-digit glyph width against the circle, verifies containment and forced-colors/Axe, and captures mandatory 390px RTL/400% screenshots plus desktop evidence. An independent Chromium 126-state Appearance preflight (three control sizes) found no glyph or overflow failures, but is not Actions acceptance. Existing CSS budgets are unchanged.
