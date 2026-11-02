# Content-mode CSS selector contract

Slateframe keeps article, portfolio, and knowledge presentation in the
WordPress Core block and block-style system. The production
`assets/css/content-modes.css` budget remains **7,000 bytes**; reducing
selector duplication must not alter rendering or introduce new JavaScript.

## Equivalent selectors

- `.is-style-slateframe-checklist > li` matches both Core
  `.wp-block-list.is-style-slateframe-checklist` and ordinary list
  markup with that block-style class. Repeating the more specific Core
  selector alongside the general selector is redundant.
- First/last-child margin resets are scoped to `.wp-block-group` with
  one of four explicit styles: key facts, learning callout, project brief,
  or definition. The nested `& > :first-child` and
  `& > :last-child` rules must **not** apply to arbitrary groups.
- Keep logical CSS properties and the existing `--slateframe-*` tokens.
  Do not change the Appearance minimum control height of 44px.

## Regression acceptance

Run the static selector-scope tests and the existing asset-budget
checks. Real WordPress + Chromium browser smoke and screenshots for the
exact PR HEAD are required before merging, including compact/default/
spacious Appearance, 320/375/390/412/768/1440/1920px, LTR/RTL,
CJK, Gutenberg, Knowledge, Portfolio, article, forms, forced-colors,
and 400% text scaling. Compare representative screenshots visually
rather than treating a successful screenshot upload as visual review.

A CSS-only cleanup must not add plugin functionality, change Core
Gallery/lightbox behavior, or broaden selectors to editor-owned markup.
