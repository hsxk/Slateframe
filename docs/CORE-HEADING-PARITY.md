# Native Core Heading: anchor and Gutenberg parity

Slateframe keeps `core/heading` fully native: WordPress owns heading levels, anchors, alignment, content, classes, links, and serialization. The theme supplies only a small conditional presentation stylesheet, also registered for Gutenberg through `add_editor_style()`. No custom heading block, JavaScript scroll handler, permalink rewrite, or SEO schema is introduced.

## Acceptance contract

- Heading levels 2, 3 and 4 remain semantic `h2`, `h3`, and `h4`; the optional Core `h1` receives bounded typographic scale without overriding an authored alignment.
- Long unbroken Japanese/Chinese/Arabic headings wrap without document-level horizontal scrolling at 320, 375, 390, 412, 768, 1440 and 1920px, in LTR and RTL.
- Locale-aware CJK tracking is normal when a heading has a matching language, while authored center alignment remains authoritative.
- Core fragment IDs are preserved; native hash navigation uses a sticky-header scroll margin, and the targeted heading receives a visible focus cue including in forced colors.
- The heading stylesheet must not load on a page without a rendered Core Heading block. The frontend and Gutenberg editor share the same rule set.
- Real Gutenberg serialization/parse/serialization must preserve level, anchor, text, and authored alignment without modifying the open editor document.
- Automated accessibility checks include keyboard focus, WCAG Axe, 200%/400% reflow, forced colors and screenshots at every requested viewport.


### Version-aware Core behavior

The disposable WordPress footer fixture contains genuine `core/heading` widget blocks. Therefore a 404 with that footer correctly loads the Heading stylesheet: it is **not** a no-block isolation fixture. The browser test now creates a blank Page and a request-scoped, test-only MU plugin that suppresses only its footer widgets, asserts no rendered `wp-block-heading` and no Heading stylesheet, and removes both fixtures afterward. Nothing from the MU plugin is packaged or deployed.

WordPress Core has migrated Heading alignment from the older `textAlign` attribute to the block-support `style.typography.textAlign` representation. The Gutenberg roundtrip uses the registered Heading schema to select the native representation and still asserts every authored value survives serialize → parse → serialize. It does not drop alignment coverage.

## Release gate

Inspect the actual WordPress/Chromium screenshot artifact for the **exact** commit SHA and confirm all required GitHub Actions succeeded for that SHA. Manual Safari/VoiceOver and Firefox review of native heading levels, fragment announcements and zoom is still required before release. Do not claim cross-browser approval from Chromium alone.
