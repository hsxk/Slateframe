# Keyboard access to native Core code

Slateframe keeps WordPress Core Code and Preformatted blocks as native `pre` and `code` markup. Long lines should scroll within the reading measure, without widening the page.

A proposed accessibility improvement adds `tabindex="0"` to Core-rendered scroll containers only when no author-provided tabindex exists. The change must not rewrite plugin-owned blocks or classic HTML. Keyboard and screen-reader behavior must be verified in real browsers before release.

Validation targets: 320, 375, 390, 412, 768, 1440 and 1920 CSS pixels; LTR/RTL; 200% text zoom; forced colors; native keyboard scrolling and screenshots. This document describes an acceptance target, not a verified release result.
