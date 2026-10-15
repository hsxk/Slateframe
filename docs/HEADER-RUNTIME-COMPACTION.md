# Shared header runtime compaction

The native header script participates in every runtime budget envelope. Core Footnotes initially exposed a hidden regression: the 16 KB `style.css` file cap passed, but combined empty-search, authored-form/discussion and Photography/discussion budgets failed. No gate or threshold was raised.

The header JavaScript has been refactored to reuse its existing class-list objects, compact-state strings, color-mode dataset key and menu-open predicate. This removes 265 bytes without adding a dependency, changing event order or changing any interaction contract. An offline Chromium baseline-versus-refactor comparison exercised eight viewport widths and seven states per session: initial responsive state, menu opening, IME Escape, normal Escape, outside dismissal, navigation-link dismissal and color toggle. Existing real WordPress browser/IME/header tests must still pass at the new exact SHA.

The final Core Footnotes controls use shared tokens and a small screen-only rule. Combined CSS/JS changes stay inside all 15 original static runtime budgets, including the 43 KB Photography + comments envelope. `tests/test_header_runtime_compaction.py` protects the IME and accessibility event hooks; no unnecessary JavaScript was added.
