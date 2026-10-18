# Core Knowledge list reflow

Slateframe's native ordered **Steps** list must remain a WordPress Core List, not a proprietary component. An `li` with anonymous text followed by Paragraph, nested List, and another Paragraph was previously a two-column CSS grid: later block children could auto-place into the narrow badge track. This especially harmed narrow CJK/RTL reading and enlarged text.

The badge is now positioned in the logical inline-start inset while the native list item retains ordinary block flow. Indentation consumes the existing `--slateframe-component-gap` token, the minimum block size reserves room for the badge, and the decimal counter stays LTR in RTL content. Nested Core lists retain their own markers. The first authored block has no artificial top gap. The Checklist checkmark and numbered badge use system text color under forced colors. No new JavaScript, custom block, post type, content migration, or new stylesheet request is introduced.

The real WordPress browser regression creates and removes a temporary page, checks all seven viewport widths in both directions, verifies alignment and document containment, and captures 1440px and 390px/RTL/200%/forced-colors screenshots. It also checks the print counter and native nested markers. The contextual CSS remains within its existing 7000-byte budget; no threshold is raised.

Gutenberg parity also reserves the same logical inline-start badge gutter in Core List editing markup at narrow RTL widths. The editor-specific rule consumes the existing component-gap token and does not change the frontend list or add runtime JavaScript. The authenticated 390/1440px editor test now measures the gutter against the native numbered badge before recording Knowledge screenshots; visual review remains mandatory.
