# Native Core Group reflow and Gutenberg parity

Slateframe leaves `core/group` markup, constrained layout, nested content, authored `alignwide`/`alignfull`, spacing and Gutenberg serialization to WordPress Core. A tiny conditional, editor-shared presentation stylesheet only bounds unaligned Group containers and allows long CJK/RTL words to wrap. No custom block renderer, framework, JavaScript or third-party resource is introduced.

## Acceptance

A disposable WordPress post contains nested Core Groups with a Core Button and multilingual unbroken text, plus explicitly authored wide/full Groups. Real Chromium tests cover 320/375/390/412/768/1440/1920px in both LTR and RTL, 200% text enlargement, 400% at 390px, no page overflow, nested bounds, 44px targets, keyboard focus, Axe WCAG 2.1 AA, and forced colors. Fourteen viewport/direction screenshots and a forced-colors screenshot are emitted. The fixture is removed in `finally`.

Authenticated Gutenberg checks native nested Group/Paragraph parse-serialize stability without changing the original editor post. Static tests enforce conditional registration, editor parity, namespace and a strict CSS budget. Safari/VoiceOver and Firefox manual review remains required before release.
