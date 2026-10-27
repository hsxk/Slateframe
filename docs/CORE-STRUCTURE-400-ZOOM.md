# Native Core structure: real 400% text and viewport evidence

Core List (ordered/reversed/nested), Separator (default/wide/dots/author color)
and Site Title (linked/unlinked heading levels) retain WordPress Core semantics.
Slateframe only owns bounded presentation and theme-neutral styling.

## Regression addressed

Existing Playwright tests set inline root font sizes but did not verify the
*computed* value. An overriding `!important` rule could let 400% assertions
pass at 100% or 200%. The shared `setRootTextScale` helper now verifies
actual 16/32/64px root font size, direction, inline priority and recalculation.
All seven responsive widths, both directions, native semantic checks, keyboard
focus, forced-colors, Axe and Gutenberg serialization remain covered.

## Screenshot acceptance

Each block now requires three 390x900 **viewport** captures at actual 400%:
LTR, RTL and RTL forced-colors. These nine PNGs are checked by
`verify_core_structure_zoom_evidence.py` for signature, IHDR CRC and exact
viewport dimensions, then the Browser screenshot inventory hashes/decodes all
images against the exact commit SHA. Manual visual inspection is still required.

Pay particular attention to nested CJK/Arabic list markers, long unbroken
site titles, author-colored separators, RTL keyboard focus and 44px targets.
Do not hide content, reduce 400% text, change Core block ownership, or relax
existing static, accessibility and package budgets.

## Release gate

Require all exact-SHA Theme quality and Photography jobs to succeed; inspect
the real WordPress/Chromium screenshots for Appearance modes, Photography,
Portfolio, Knowledge, Article, Header/Search/Forms/Footer and these new
captures; validate the reproducible distributable ZIP, mergeable PR and
unresolved review threads. After merging, verify main SHA and resync the
long-lived branch. No production site is touched.
