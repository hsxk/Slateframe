# Readable classic archive headings

The classic archive.php template preserves WordPress Core's archive title,
including localized category/tag/date/taxonomy prefixes and permitted inline
markup. It wraps the title in bdi so CJK, Arabic and Latin content cannot
reorder the surrounding layout. When a Core display filter supplies an empty,
HTML-only, Unicode-invisible or non-string value, the theme renders a localized
Category archive, Tag archive, Date archive, Content archive or Archive H1
according to the native Core archive type.

This is a presentation fallback only. It does not change taxonomy terms,
registered post types, the main query, archive descriptions, pagination,
Gutenberg Core Query Title blocks or SEO metadata. Display output is restricted
to WordPress post-safe HTML; no CSS, JavaScript, dependency or network request.

Regression:

* tests/test_archive_readable_heading.py executes the actual PHP template with
  Core-compatible adapters. It checks prefixed markup, multilingual labels,
  invisible Unicode, HTML-only titles, malformed filter values, escaping,
  descriptions and PHP syntax.
* tests/browser/archive-readable-heading.spec.js uses a real WordPress
  category archive HTTP route. A disposable mu-plugin changes the Core archive
  title only for requests carrying a test-only query flag; other requests
  and concurrent workers are unaffected. The plugin is removed in finally.
* Browser coverage: 320, 375, 390, 412, 768, 1440, 1920px; LTR/RTL;
  100%/400% text, document overflow, Axe, skip-link keyboard focus,
  forced-colors and two mandatory exact-HEAD screenshots.

All required Actions, ZIP reproducibility and manual screenshot inspection
remain mandatory before merging.
