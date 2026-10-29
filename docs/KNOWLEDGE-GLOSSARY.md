# Knowledge glossary

The Knowledge glossary pattern (slateframe/knowledge-glossary) provides three editable terms, plain-language meanings and usage examples. Unlike the single-term Definition callout, it creates a compact reference section for an entire article or guide. Authors can add, remove and reorder entries through normal WordPress Core controls.

Only native Group, Heading and Paragraph blocks are used. Existing is-style-slateframe-definition presentation is reused, without new runtime CSS, JavaScript, URLs, images, custom data, SEO schema or dependencies. Every example is localized through esc_html_x and should be replaced before publishing.

The real WordPress browser regression covers 320/375/390/412/768/1440/1920px, LTR/RTL and 16/32/64px root text, rejecting document overflow, off-viewport pattern geometry and clipped text fragments. It runs Axe at 390px RTL/400% forced colors and captures the viewport plus each full glossary entry and a 1440px LTR view. A separate authenticated Gutenberg test rejects invalid/missing blocks and checks 390px RTL/200% and 1440px LTR editor containment. Disposable WordPress fixtures are removed in finally blocks. The Python contract checks native block delimiters, localized content, absence of personal/external URLs and browser acceptance coverage.

The pattern is a presentation aid, not a taxonomy, translation manager or fact-checker. Review the exact HEAD's real WordPress/Chromium screenshots and distributable ZIP before merge.
