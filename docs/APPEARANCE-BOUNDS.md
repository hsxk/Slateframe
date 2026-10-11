# Appearance numeric invariants

Slateframe exposes a small, bounded set of WordPress Customizer controls rather than an unrestricted design framework. Control height is **never below 44px**; other spatial ranges remain defined in `slateframe_layout_control_definitions()`.

Numeric values can also arrive through direct `set_theme_mod()` calls or integrations, bypassing the browser's range input. Both the Customizer sanitizer and the runtime value resolver must reject `NAN`, positive/negative infinity, and overflowed exponent strings before clamping. An invalid value falls back to that control's documented default; finite out-of-range values clamp to their published bounds. The CSS number formatter must never emit `nan` or `inf` tokens.

`tests/test_appearance_finite_bounds.py` checks these invariants without requiring a WordPress database. Exact-commit WordPress compatibility and browser/Appearance checks remain mandatory before merging.

The runtime and Customizer share the same bounded numeric definitions. Regression tests cover numeric `NAN`/`INF`, overflowed exponent strings, invalid input, valid decimals, lower and upper clamps, and the CSS formatter's non-finite fallback. Browser acceptance must still inspect compact/default/spacious layouts and interactive target sizes at supported viewports.