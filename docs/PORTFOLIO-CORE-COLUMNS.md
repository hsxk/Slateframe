# Core Query Loop column parity

The Portfolio pattern is a native WordPress Query Loop. Slateframe must respect the author's Core `columns-1` through `columns-6` choice instead of forcing three desktop columns. On tablet widths (641–900px) the layout caps at two columns without turning a deliberate single-column layout into two. At 640px and below it uses one column.

When Core chooses `is-layout-grid`, the Core grid layout remains authoritative; Slateframe only overrides the legacy flex template. The footer retains its own single-column rule. All controls, typography, links, dates and featured-image behavior remain unchanged.

Validation: `python3 -m unittest tests/test_portfolio_columns_contract.py`; `tests/browser/portfolio-core-columns.spec.js` runs against the real WordPress Portfolio fixture in Theme quality. Inspect exact-SHA 390/1440px screenshots and Core editor parity before merge. Earlier isolated Chromium verification exercised 360 combinations of 320–1920px, 1–6 columns, RTL/LTR, editor/front-end and Core Grid, but it does not replace WordPress Actions.
