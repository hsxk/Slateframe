# Native Core List parity

Slateframe leaves `core/list` and `core/list-item` to WordPress. Ordered and reversed numbering, `start`, nested lists, list markers, language tags, links, and Gutenberg serialization are **content**, not theme-owned data. The conditional `core-list.css` changes only intrinsic reflow for multilingual and long unbroken list items, with the same CSS added to the editor canvas. No custom block, JavaScript, shortcode, post type, SEO, or business feature is introduced.

## Acceptance contract

- A disposable published post contains an authored ordered list with `start=4` and `reversed`, plus nested unordered items in Japanese, Chinese, Arabic and long URLs.
- Preserve `ol`, `ul`, `li`, nested hierarchy, browser markers, authored numbering, and fragment links. Do not replace or hide markers, change list counters, or normalize Core markup.
- Validate 320, 375, 390, 412, 768, 1440 and 1920px in both LTR and RTL, at 100% and 200% root text, plus 400% at 320 and 390px. No horizontal document overflow beyond 1px.
- Assert computed wrapping for lists and list items, inherited direction, ordered decimal and unordered disc marker styles, and keyboard focus.
- Run WCAG 2.0/2.1 A/AA Axe and forced-colors focus checks. Save 14 regular viewport screenshots and a 390px RTL/200% forced-colors screenshot from real WordPress/Chromium.
- Use a request-scoped blank Page fixture to check that the conditional block asset is absent when no native List is rendered. Restore the footer and delete all temporary WordPress content and mu-plugin files.
- Serialize → parse → serialize a native Core List with native List Item children in an authenticated Gutenberg session without changing the editor document.
- Require source presence, a strict 350-byte CSS budget, 15 screenshot artifacts, and inclusion of the CSS and PHP module in the reproducible theme ZIP.
- Visually inspect artifacts from the **exact PR HEAD** and require successful Theme quality and Photography Actions before merging. Verify main merge SHA afterward.

Manual Safari/VoiceOver, Firefox and non-Chromium high-zoom checks remain pre-release follow-ups.
