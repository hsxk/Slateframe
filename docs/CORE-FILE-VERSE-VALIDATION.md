# Core File and Verse: native publishing regression

This vertical slice builds on PR #48. It preserves native Core File markup, including two separate keyboard-reachable links (filename and Download), and gives the filename the same bounded control height as the existing Download button in the published canvas and Gutenberg.

Core Verse poetry must retain newlines and follow the document's LTR/RTL writing direction. The earlier RTL override applied `direction:ltr` to every `pre`, accidentally including Verse; the correction excludes Verse while keeping code left-to-right. The editor receives an explicit code-direction rule so Gutenberg and the frontend agree. No custom download handler or JavaScript is shipped.

The real WordPress/Chromium browser regression checks 320, 375, 390, 412, 768, 1440, and 1920px in both directions, plus 390px RTL at 200% text size and forced colors. It verifies native links, target geometry, code-local scrolling, no document overflow, and keyboard focus; it emits a screenshot for human review.

**Release gate:** neither local syntax tests nor synthetic browser fixtures are acceptance. Require success for every necessary push and PR Action at the exact HEAD SHA, inspect actual screenshot artifacts, then merge and verify the main merge SHA. Do not deploy to a production website.
