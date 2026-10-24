# Footer Core Footnotes: inline links and bounded return controls

The footer's generic widget link styling uses `inline-flex` for utility links. That rule also caught Core Footnotes source references inside `sup` and ordinary links inside numbered footnotes, changing inline reading flow. Slateframe now exempts only those reading links; the `#fnref` return action remains a bounded 44–56px control, and navigation links keep their existing presentation.

The Playwright regression injects native Core Footnotes markup into the actual WordPress footer and checks the two kinds of inline link separately from the return control at seven widths in LTR and RTL. Representative mobile and desktop runs also exercise 200% text, keyboard Tab/Enter, forced colors, axe, numbering, overflow and screenshot evidence. The test does not contact the citation URL or alter stored content. The existing `style.css`, footer CSS, and print CSS budget thresholds remain enforced without relaxation.

This is a local code change pending an exact-HEAD GitHub Actions run and human review of real WordPress screenshots. It is not a published theme fix until merged.
