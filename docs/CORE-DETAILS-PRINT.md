# Native Details in print

Closed WordPress Core Details are not printed by Chromium merely by changing
`display` on their descendants: the browser's native closed-disclosure state
still suppresses the body. That can silently omit article instructions,
reference notes and nested disclosures from paper/PDF output.

Slateframe's small shared script temporarily opens only closed `details`
within `.slateframe-prose` when `beforeprint` fires. The `afterprint` handler
restores exactly those initially closed disclosures, leaving already-open
ones unchanged. Duplicate `beforeprint` events do not lose the saved state.
No synthetic `aria-expanded`, custom disclosure widget or plugin is involved.

The screen experience remains native, including keyboard, focus, RTL and
nested Core Details. Without JavaScript, browsers print their native closed
state; Slateframe does not claim to override browser printing semantics in CSS.

Validation: `tests/browser/print-closed-details.spec.js` runs against the real
WordPress article, covers 320–1920px, 200% mobile RTL and forced colors,
checks nested disclosure visibility and cleanup, and records print screenshots.
Static preflight alone is not a substitute for exact-HEAD Actions evidence.
