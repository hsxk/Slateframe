# Native Core Embed fallback link accessibility

Slateframe keeps WordPress Core Embed markup and Gutenberg serialization intact. An
offline or blocked embed may expose a plain fallback link rather than an iframe.
The theme now gives that native link a bounded minimum 44px target without replacing
the link, adding JavaScript, or forcing external content to load.

## Acceptance

- Seven viewports: 320, 375, 390, 412, 768, 1440 and 1920 CSS pixels.
- Both LTR and RTL; mixed Japanese, Chinese, Arabic and unbroken link labels.
- Native fallback link remains keyboard reachable, visible with forced colors,
  and at least 44px high at normal text size.
- Shared helper confirms the **computed** 16/32/64px root font, not just an
  inline style request. The 390px RTL 400% screenshot uses a real 390x900 viewport.
- CI rejects absent, corrupt, wrong-sized or non-PNG screenshot evidence.
- Existing Axe, Core Embed Gutenberg parse/serialize, iframe containment,
  caption wrapping and disposable WordPress fixture checks remain active.

This is a presentation-only fix. It does not fetch remote media, alter Core block
attributes, add plugins or affect production websites.
