# Native Fieldset legend at 400% text zoom

A 390px RTL WordPress+Chromium screenshot on commit `79f6826` exposed an
orphan final `s` in the mixed CJK/Arabic/English legend `form controls`.
The `--slateframe-space-2` token scales from 8px at default text size to
32px at a 64px root size, leaving less room for actual words. Keep the
shared spatial tokens for the fieldset. The legend uses a fixed 4px inline
padding: at the supported 16/32/64px root sizes, the prior
`min(var(--slateframe-space-2),4px)` already computed to exactly 4px.
This equivalent simplification preserves the visual layout while keeping
the existing 750-byte CSS budget, without hiding or internally scrolling
the form.

The browser regression covers 320, 375, 390, 412, 768, 1440 and 1920px,
LTR/RTL, root text sizes 16/32/64px, horizontal overflow and forced-colors
screenshots. At 320px/400%, a word may legitimately need to break because
its glyphs are wider than the remaining line; it must remain visible.

Local synthetic Chromium comparisons are only preliminary. Release acceptance
requires the precise new SHA's real WordPress+Chromium Actions screenshots,
WPCS, Theme Check, and WordPress/PHP checks before merging.
