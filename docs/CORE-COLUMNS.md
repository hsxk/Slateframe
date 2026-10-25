# Native Core Columns and RTL/CJK reflow

Slateframe leaves `core/columns` and `core/column` markup, breakpoint behavior, `isStackedOnMobile`, widths, and Gutenberg serialization to WordPress Core. A tiny conditional presentation stylesheet removes intrinsic minimum-width pressure on nested columns, including long unbroken multilingual text. It is registered for the editor too. There is no layout framework, JS, third-party asset or custom block renderer.

## Acceptance evidence

A disposable WordPress post contains two Core Columns compositions: the default stacked-on-mobile layout with a Core Button, and an authored `isStackedOnMobile:false` layout. The browser checks seven viewport widths (320, 375, 390, 412, 768, 1440, 1920), both LTR and RTL, 16/32px root font, 64px root font at 390, no document overflow, Core mobile stacking and nonstacking, 44px link targets, visible keyboard focus, Axe WCAG 2.1 AA, and forced-colors. All seven widths in both directions and the forced-colors state produce real screenshots. The post is deleted in `finally`.

Authenticated Gutenberg tests serialize and parse native nested Columns and Column blocks twice, asserting stable attributes and preserving the original editor content. A static contract checks CSS scope, editor parity, namespace and asset budget.

Manual Safari/VoiceOver and Firefox review remains required before release. Core remains responsible for layout decisions; this theme does not force stacking for user-authored nonstacking layouts.
