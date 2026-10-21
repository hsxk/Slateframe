# Native Fieldset legend at 400% text zoom

A 390px RTL WordPress+Chromium screenshot on commit `79f6826` exposed an
orphan final `s` in the mixed CJK/Arabic/English legend `form controls`.
The `--slateframe-space-2` token scales from 8px at default text size to
32px at a 64px root size, leaving less room for actual words. Keep the
shared token but cap the legend's inline padding at 4px. This preserves
font scaling and avoids hiding or internally scrolling the form.

The browser regression covers 320, 375, 390, 412, 768, 1440 and 1920px,
LTR/RTL, root text sizes 16/32/64px, horizontal overflow and forced-colors
screenshots. At 320px/400%, a word may legitimately need to break because
its glyphs are wider than the remaining line; it must remain visible.

Local synthetic Chromium comparisons are only preliminary. Release acceptance
requires the precise new SHA's real WordPress+Chromium Actions screenshots,
WPCS, Theme Check, and WordPress/PHP checks before merging.
