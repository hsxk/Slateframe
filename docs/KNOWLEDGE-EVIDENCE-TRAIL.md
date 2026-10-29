# Knowledge evidence trail

The `slateframe/knowledge-evidence-trail` pattern helps authors keep **a claim, its verification method, and its limitations** next to each other. It is an editorial presentation aid, not a fact-checker, citation database, SEO schema, source scraper, or content model.

The pattern contains only native WordPress Group, Columns, Column, Heading and Paragraph blocks. Its three columns use the existing `is-style-slateframe-ledger` style. Authors should replace every translated prompt with their own material, link to the original source through the ordinary Core link control, record the source date where relevant, and revise the caveat when new evidence arrives. No URL, image, post ID, business name, or data is bundled into the pattern.

The claim is deliberately distinct from the evidence: a statement without a verifiable method should not be presented as a measurement. The final paragraph reminds authors to review dates and assumptions. Nothing is published or updated automatically.

## Acceptance

The real WordPress browser regression loads the **registered PHP pattern**, publishes an isolated page and verifies all three columns across 320/375/390/412/768/1440/1920px, LTR/RTL and 16/32/64px root text. It rejects document overflow, clipped text fragments and off-viewport columns, runs scoped Axe checks at 390px RTL with 200% text and forced colors, and captures 390px RTL 200%/400% forced-colors and 1440px LTR WordPress/Chromium screenshots. A separate authenticated Gutenberg test rejects invalid or missing blocks and checks the native Columns/Heading structure and 390px RTL/200% plus 1440px LTR editor containment. Both fixtures are deleted in `finally` blocks.

The static contract checks slug/file consistency, balanced block delimiters, localized copy, Core-only markup and the absence of external/personal links. No runtime CSS/JS or dependency is added. Review the exact HEAD's actual screenshots and distributable ZIP before merge; a local test or an older SHA's green Actions is not release acceptance.

## Zoom screenshot evidence

At 390px RTL and 200%/400% text, the viewport captures are anchored on the evidence heading rather than centering a very tall pattern and accidentally showing only a middle paragraph. At 400%, the Browser artifact also contains three separate full-column screenshots (`claim`, `source`, `limits`) so reviewers can inspect all text instead of assuming a single viewport proves complete visibility. The published test fixture includes Japanese, Chinese, Arabic and an unbroken identifier inside the Core columns; fragment geometry must remain inside both its column and the viewport at all seven widths, both directions and three root font sizes. These are disposable test-only paragraphs, not bundled pattern content.
