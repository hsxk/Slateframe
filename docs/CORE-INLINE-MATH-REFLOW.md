# Native inline MathML at large text sizes

WordPress Core owns MathML markup, Math blocks, serialization, and editing. Slateframe adds no MathJax, renderer, script, shortcode, or plugin dependency. The singular reading stylesheet contains inline math that does not declare display="block"; the same rule is available in Gutenberg. An inline equation remains an inline-block with a container-relative maximum width and its own horizontal overflow when the two-dimensional expression cannot wrap. Standalone block MathML retains its native display and Core's own presentation.

## Why

A long unbroken inline equation in a paragraph, heading, or list can force the entire document to scroll horizontally at 400% text size. This is especially disruptive at 320–390px, in RTL and mixed CJK/Arabic content. The bounded rule confines unavoidable two-dimensional scrolling to the expression rather than the page. Headings explicitly allow anywhere wrapping without changing their authored type scale.

## Acceptance

Real WordPress/Chromium runs a disposable Core paragraph, heading and list fixture at 320/375/390/412/768/1440/1920px, LTR/RTL and computed 16/32/64px root sizes (42 combinations). It checks zero document overflow, three bounded native MathML elements, retained standalone display=block, and genuine 390px/400% screenshots. Gutenberg checks a native Core paragraph MathML serialization/parse roundtrip without saving or changing the editor document. Six complete, non-linked PNGs, including forced colors, are mandatory in the exact-HEAD Browser artifact.

The existing reading CSS budget remains 7,000 bytes; no new runtime asset is introduced. WordPress 6.7/PHP 7.4, WPCS, Theme Check, ZIP safety and cross-page visual evidence remain unchanged. Independent Chromium preflight of 42 combinations is useful but not a substitute for real WordPress Actions or manual screenshot review. Firefox and Safari/VoiceOver math navigation remain manual release checks.
