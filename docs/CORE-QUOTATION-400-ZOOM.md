# Native Core quotations: computed 400% text and viewport evidence

Core Quote, Pullquote and Verse remain WordPress-owned blocks. Slateframe owns
only their bounded, language-neutral presentation, including the plain Quote,
solid-color Pullquote, preserved Verse line breaks and citation semantics.

## Regression addressed

These three existing Playwright suites previously set an inline root font size
without checking Chromium's *computed* value. An `!important` rule could
leave 400% checks running at 100% or 200%, producing false confidence.
All seven responsive widths (320, 375, 390, 412, 768, 1440, 1920), LTR/RTL
and existing Axe, keyboard, forced-colors and Gutenberg assertions are retained.
The shared `setRootTextScale` helper now waits for style recalculation and
asserts actual 16/32/64px computed root font sizes and direction.

## Required visual evidence

At 390x900 the suites capture a **viewport**, not an isolated block, at
actual 64px root text in both directions, plus RTL 400% forced-colors.
There are nine required PNG files (three per block). The Theme quality job
checks their presence, valid PNG signature, IHDR CRC and exact viewport
dimensions; the existing Browser screenshot inventory independently decodes
and hashes all images for the precise HEAD SHA.

Screenshots are evidence of actual rendering, not automatic visual approval.
Inspect long CJK/Arabic quotations, unbroken text, citations, Verse poetry
line breaks and scroll/focus context before merging. Do not shrink 400% text,
hide content, replace Core block semantics, relax 44px targets, or lower
existing a11y and package budgets.

## Acceptance

Require success of all exact-SHA Theme quality and Photography Actions,
manual inspection of the real WordPress/Chromium screenshot artifacts
(including Appearance compact/default/spacious, Photography/Lightbox,
Portfolio, Knowledge/Article, header/search/forms/footer), reproducible
distribution ZIP checks and zero unresolved blocking review threads.
After squash merge, verify main merge SHA Actions and restore the long-lived
`automation/continuous-development` branch.

No production site is used. Safari/VoiceOver and Firefox still need separate
manual release verification.
