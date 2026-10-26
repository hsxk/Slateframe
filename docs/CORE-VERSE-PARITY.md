# Core Verse: multilingual poetry and Gutenberg parity

Slateframe keeps `core/verse` native. WordPress owns the `pre.wp-block-verse` markup, line breaks, authored typography, and Gutenberg serialization. The conditional `core-verse.css` presentation layer protects intrinsic reflow only; it preserves `pre-wrap` and the document's writing direction, unlike `core/code` (which remains LTR). No custom block, JavaScript, translation string, remote asset, or SEO behavior is introduced.

## Acceptance contract

- Publish a disposable real WordPress post with three poetry lines, indentation, Japanese, Chinese, Arabic, and a long unbroken reference.
- Preserve the native Gutenberg RichText <br> line separators, text content and indentation, semantic `pre.wp-block-verse` element, and authored language.
- Check seven viewport widths (320/375/390/412/768/1440/1920), LTR/RTL, 200% text zoom and 390px 400% zoom. No document overflow; the poem must inherit the document direction.
- Verify `white-space: pre-wrap`, `overflow-wrap: anywhere`, and normal Unicode word breaking; do not turn verse into a code-scrolling widget.
- Run scoped WCAG Axe audit, reduced-motion/forced-colors evidence, 14 normal screenshots and one RTL forced-colors screenshot from real WordPress + Chromium.
- Ensure conditional block styles do not appear on a disposable blank Page (request-scoped footer-widget isolation), and clean up all fixtures.
- In authenticated Gutenberg, serialize → parse → serialize a native Verse block without editing the actual post; require stable valid markup and preserved multilingual text.
- Enforce a 220-byte asset budget, required source files, screenshot evidence and ZIP inclusion in CI.

Visual acceptance requires downloading and **actually inspecting** the exact PR HEAD screenshots. Both Theme quality and Photography runtime Actions must succeed for that SHA before merging. Manual Safari/VoiceOver and Firefox remain release follow-ups.
