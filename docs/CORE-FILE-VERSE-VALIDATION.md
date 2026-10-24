# Core File and Verse: native publishing regression

This vertical slice builds on PR #48. It preserves native Core File markup, including two separate keyboard-reachable links (filename and Download), and gives the filename the same bounded control height as the existing Download button in the published canvas and Gutenberg.

Core Verse poetry must retain newlines and follow the document's LTR/RTL writing direction. The earlier RTL override applied `direction:ltr` to every `pre`, accidentally including Verse; the correction excludes Verse while keeping code left-to-right. The editor receives an explicit code-direction rule so Gutenberg and the frontend agree. No custom download handler or JavaScript is shipped.

The real WordPress/Chromium browser regression checks 320, 375, 390, 412, 768, 1440, and 1920px in both directions, plus 390px RTL at 200% text size and forced colors. It verifies native links, target geometry, code-local scrolling, no document overflow, and keyboard focus; it emits a screenshot for human review.

**Release gate:** neither local syntax tests nor synthetic browser fixtures are acceptance. Require success for every necessary push and PR Action at the exact HEAD SHA, inspect actual screenshot artifacts, then merge and verify the main merge SHA. Do not deploy to a production website.

## Stylesheet readiness regression (October 2026)

An exact-SHA push browser run exposed a real timing gap: the Core File geometry test clicked through to an article, then measured the first filename link before the article's theme stylesheet had finished loading. The Playwright trace recorded pending `style.css` and `reading.css` responses (`status: -1`); computed `overflow-wrap` was temporarily `normal`, although the intended rule is `anywhere`. The test now navigates to the resolved article permalink with `waitUntil: 'networkidle'` and explicitly waits for the actual computed `overflow-wrap: anywhere` before testing all seven viewports and both directions. This preserves the original geometry assertions and does not skip or weaken the test. Both push and PR workflows must verify the new SHA; no rerun of the failed SHA is an acceptance substitute.
