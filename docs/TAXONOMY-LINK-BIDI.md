# Taxonomy link direction and touch-target contract

Slateframe leaves taxonomy links, term IDs, URLs, Core block markup and translation
ownership with WordPress. The theme supplies only presentation.

- Classic single-post category and tag links inside `.slateframe-entry-footer`
  remain Core-generated anchors. The theme applies only `unicode-bidi: isolate`
  to keep mixed-script labels separate from adjacent punctuation. It preserves
  the original Core link markup and URL. The bounded 44px minimum width and
  height now apply to the classic anchors as well as the Core blocks. This
  matches `--slateframe-control: 44px` while keeping the strict aggregate CSS
  budget unchanged; the native anchors remain inline-block and can wrap.
- Native Core Post Terms and Categories links retain their existing 44px targets,
  link markup, and responsive wrapping. Their scoped rules explicitly isolate
  mixed RTL/CJK labels. No forced `dir=ltr`, extra JavaScript, global selector,
  SEO/taxonomy behavior or plugin-specific integration is introduced.
- Core Tag Cloud anchors already use inline-block, which establishes an
  independent formatting context; the tightly capped Tag Cloud asset is unchanged.
- The explicit light color-mode selector was redundant: the root already
  declares `color-scheme: light`, and the dark-system rule excludes roots with
  a selected mode. Removing only that duplicate selector offsets the new
  bounded classic link geometry. Existing real WordPress color-mode tests
  continue to assert explicit light selection under dark system preference.
- The real WordPress article fixture must contain its Core-generated category
  link. The browser test checks the original URL, computed isolation, seven
  viewport widths, RTL/LTR, 100%/400%, keyboard focus, Axe
  WCAG 2.1 AA and forced-colors, without replacing the original anchor.
- The exact-HEAD Browser smoke artifact must include three mandatory footer
  screenshots: `taxonomy-footer-1440-ltr.png`,
  `taxonomy-footer-390-rtl-400.png`, and
  `taxonomy-footer-390-rtl-400-forced-colors.png`.
  Inspect the actual WordPress/Chromium images before merging.
- Keep static CSS budgets unchanged, including the stricter 38,000-byte shared
  runtime envelope (and 43,000-byte Photography discussion envelope), plus
  publishing 4,500 bytes, Core Post Terms 450 bytes and Core Categories 550
  bytes. Core taxonomy 44px targets and their tests remain unchanged.

No production site was accessed, and no legacy site content was imported.
