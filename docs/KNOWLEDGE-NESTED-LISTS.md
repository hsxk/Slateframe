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
badge, minimum block size and inline-start gutter. It is computed as
max(var(--slateframe-control), 1.3rem), retaining the 44px Appearance floor
while allowing two-digit counters to grow with 400% text. Using rem rather
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
