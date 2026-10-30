# Native Core Details: RTL Gutenberg marker clearance

The WordPress editor's native `core/details` disclosure marker can sit flush
against the inline-start edge when the canvas is RTL and text is magnified.
The actual WordPress/Chromium evidence for the previous merged theme, at
`390px`, RTL, `200%` text and forced colors, showed the second and third
summary triangles partially clipped by the editor capture edge.

Slateframe now adds a bounded **logical** inline-start inset to the native
`summary` **only inside the Gutenberg editor**. It does not replace the
Core `<details>/<summary>` elements, native keyboard behavior, disclosure
state, marker rendering, user-authored direction or front-end presentation.
The inset is `min(.75em,24px)`: it scales for normal text but is capped
for 200–400% zoom. No JavaScript or remote dependencies are introduced.

The existing authenticated Gutenberg Playwright fixture asserts that all
three Core summaries retain the inset at both 200% and 400% RTL and that the
editor canvas has no horizontal overflow. Existing WordPress Core Details
keyboard, a11y, print, forced-colors and seven-viewport checks remain.
The final visual decision requires inspecting the **new exact HEAD SHA**
WordPress/Chromium screenshot, not just passing CSS assertions.
