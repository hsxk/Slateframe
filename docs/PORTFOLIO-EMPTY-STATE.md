# Native Portfolio empty state

The `slateframe/portfolio-project-grid` pattern remains a WordPress Core Query Loop. When its query has no posts, visitors should see a neutral, translated message rather than site-owner instructions about publishing. The text belongs to Core's `query-no-results` inner block and can be edited or replaced in Gutenberg without proprietary data or blocks.

The isolated real WordPress browser regression loads the **registered** `slateframe/portfolio-project-grid` pattern, changes only its empty search attribute to a unique unmatched term, and publishes a temporary Core Query Loop page. This catches regressions in the shipped pattern rather than a manually duplicated test fixture. It verifies the message is visible, checks for no phantom project cards or pagination links, and exercises RTL/LTR, 200% root text size, forced-colors, and viewport boundaries for all Playwright projects. At 390px and 1440px it captures full-page evidence; cleanup removes the temporary page even after an assertion failure.

No CSS or JavaScript is added, and the existing Portfolio responsive column contract, 44px control floor, CSS budgets, plugin coexistence, and release packaging are unchanged. The actual WordPress+Chromium Actions for the exact commit must pass before this slice merges.
