# Native authored form action reflow

Slateframe offers one opt-in presentation utility, `slateframe-form-actions`,
for native HTML form action rows built inside WordPress content. Authors may
apply it to a flex container (for example, a Core Group with additional CSS
class and flex layout) to let submit/reset buttons wrap at narrow widths and
400% text zoom without scripting or changing form submission semantics.

The rule `form .slateframe-form-actions{flex-wrap:wrap}` is deliberately small:
it preserves the author's display, gap, alignment, button order, and keyboard
order. It does not apply to unrelated site forms, does not overwrite an inline
`display:flex`, and has no effect on the native WordPress Core Buttons block,
which already handles its own wrapping. Long labels may still need substantial
vertical space at 400% text zoom; this rule prevents adjacent buttons from
being squeezed into unreadable columns. Prefer ordinary `<button>` elements
for multilingual multiline labels. `input[type=submit]` is intrinsically
single-line in Chromium and is not rewritten by the theme.

The regression fixture loads the real theme-local authored-form CSS in a real
WordPress page. Acceptance covers 320/375/390/412/768/1440/1920px,
LTR/RTL, 100/200/400% text zoom, page and internal overflow, button bounds,
non-overlap, keyboard focus, forced-colors, and Axe. This is presentation-only:
no plugin, analytics, SEO, cache, runtime JavaScript, or production dependency.
