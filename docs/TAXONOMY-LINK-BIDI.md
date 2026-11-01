# Taxonomy link direction and touch-target contract

Slateframe leaves taxonomy links, term IDs, URLs, Core block markup and translation
ownership with WordPress. The theme supplies only presentation.

- Classic single-post category and tag links inside `.slateframe-entry-footer`
  remain Core-generated anchors. The theme gives each anchor a bounded minimum
  block and inline size of `--slateframe-control` (44px), allows wrapping at 320px and 400%
  text enlargement, and applies `unicode-bidi: isolate` to keep each mixed-script
  label separate from adjacent punctuation.
- Native Core Post Terms and Categories links retain their existing 44px targets,
  link markup, and responsive wrapping. Their scoped rules explicitly isolate
  mixed RTL/CJK labels. No forced `dir=ltr`, extra JavaScript, global selector,
  SEO/taxonomy behavior or plugin-specific integration is introduced.
- Core Tag Cloud anchors already use inline-block, which establishes an
  independent formatting context; the tightly capped Tag Cloud asset is unchanged.
- The real WordPress article fixture must contain its Core-generated category
  link. The browser test checks the original URL, computed isolation, computed
  44px two-axis minimum (including short labels), seven viewport widths, RTL/LTR, 100%/400%, keyboard focus, Axe
  WCAG 2.1 AA and forced-colors, without replacing the original anchor.
- The exact-HEAD Browser smoke artifact must include three mandatory footer
  screenshots: `taxonomy-footer-1440-ltr.png`,
  `taxonomy-footer-390-rtl-400.png`, and
  `taxonomy-footer-390-rtl-400-forced-colors.png`.
  Inspect the actual WordPress/Chromium images before merging.
- Keep static CSS budgets unchanged (publishing 4500 bytes, Core Post Terms
  450 bytes, Core Categories 550 bytes). No test may be skipped or relaxed.

No production site was accessed, and no legacy site content was imported.
