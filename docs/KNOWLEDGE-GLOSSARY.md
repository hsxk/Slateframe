# Knowledge glossary

The Knowledge glossary pattern (slateframe/knowledge-glossary) provides three editable terms, plain-language meanings and usage examples. Unlike the single-term Definition callout, it creates a compact reference section for an entire article or guide. Authors can add, remove and reorder entries through normal WordPress Core controls.

Only native Group, Heading and Paragraph blocks are used. Existing is-style-slateframe-definition presentation is reused, without new runtime CSS, JavaScript, URLs, images, custom data, SEO schema or dependencies. Every example is localized through esc_html_x and should be replaced before publishing.

The real WordPress browser regression covers 320/375/390/412/768/1440/1920px, LTR/RTL and 16/32/64px root text, rejecting document overflow, off-viewport pattern geometry and clipped text fragments. It runs Axe at 390px RTL/400% forced colors and captures the viewport plus each full glossary entry and a 1440px LTR view. A separate authenticated Gutenberg test rejects invalid/missing blocks and checks 390px RTL/200% and 1440px LTR editor containment. Disposable WordPress fixtures are removed in finally blocks. The Python contract checks native block delimiters, localized content, absence of personal/external URLs and browser acceptance coverage.

The pattern is a presentation aid, not a taxonomy, translation manager or fact-checker. Review the exact HEAD's real WordPress/Chromium screenshots and distributable ZIP before merge.

## Bounded padding at 400% text enlargement

The shared Definition block style previously used `1rem 1.1rem` padding, which grows to 70.4px on **each inline edge** at a 64px root font. This made otherwise accessible long CJK/Arabic glossary entries unnecessarily tall on narrow screens. `min(1rem,20px) min(1.1rem,24px)` preserves the original 16px baseline padding and enlarged text size, while bounding the physical padding at 200–400%. The existing 7,000-byte `content-modes.css` budget is unchanged; equivalent selector whitespace was compacted to offset the new rule. WordPress Core Group, Heading and Paragraph markup and Gutenberg controls are unchanged.

The real WordPress acceptance matrix now checks computed logical start/end and block padding for all seven viewports, both directions and 16/32/64px root sizes, in addition to the existing fragment containment, Axe, editor and screenshot checks. An isolated Chromium preflight (not Actions verification) found the representative 390px RTL/400% entry fell from about 5,145px to 3,760px tall, with no horizontal overflow; exact-HEAD WordPress/Chromium evidence remains mandatory before merge.

## Shared Knowledge callout and Metrics spatial bounds

The Core Group learning-callout and Core Columns Metrics style now use `min(var(--slateframe-space-4),20px)` for physical padding. The existing `--slateframe-space-4` base token backs the `--slateframe-stack-gap` semantic token; normal 16px padding is unchanged, while 32/64px root text no longer loses 64px on each edge. Mobile stacked Metrics columns still use their existing zero-inline-padding rule. No new JS, custom block, data type or HTTP request is introduced.

A 42-case isolated Chromium preflight with the actual production CSS (seven widths, LTR/RTL, 16/32/64px roots) found no horizontal overflow. Representative 390px RTL/400% mixed-script callout height fell from 6,647px to 4,853px; this preflight is **not** Actions acceptance. The real WordPress browser test additionally checks computed padding, CJK/Arabic and unbroken identifiers, Axe/forced-colors, 390/1440px screenshots and Gutenberg serialization. The 7,000-byte CSS budget is unchanged.
