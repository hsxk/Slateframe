# Core data table numeral parity

WordPress Core table markup uses a figure wrapper and a native table. Browser
user-agent styles can reset font-variant on the table even when the wrapper
has tabular-nums. Therefore both the figure and its table must retain the
explicit Slateframe data-table style. A local Chromium computed-style probe
caught a regression where simplifying this selector left table cells with
normal numerals. The fix restores both selectors without changing budgets.

A new static contract and real WordPress/Chromium browser test assert tabular
numerals on the wrapper, table, and cell in LTR and RTL. New browser fixture
screenshots are saved for media, Calendar, spatial arithmetic, and data table.
Screenshots must be inspected from exact-HEAD Actions before merging.
