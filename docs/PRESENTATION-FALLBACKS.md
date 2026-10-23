# Core presentation fallback boundaries

Slateframe uses WordPress Core for post titles, featured image captions and the native page-menu fallback. The theme only supplies a presentation layer, never post data, content ownership or routing.

A filtered title that is not a string is treated as untitled and receives the translated `Untitled` label. Valid HTML titles, CJK and RTL copy are returned unchanged; empty or markup-only titles still receive the existing accessible fallback. No string casts of arbitrary filter objects are attempted.

The featured-image hero remains visible when the attachment caption is empty or malformed. Only a non-empty string caption is sent to Core `wp_kses_post()`. Valid HTML captions and responsive image markup remain intact. The page-menu fallback keeps its Home link if a filtered `wp_list_pages()` result is null, false, or non-string; accepted markup continues through Core's sanitizer.

Regression: `python3 -m unittest tests/test_presentation_fallbacks.py` and `php -l tests/fixtures/presentation-fallbacks.php.fixture`. The isolated PHP fixture treats warnings as failures, checks valid multilingual copy, malformed filter results and balanced hero markup. It is excluded from the theme ZIP. Required exact-HEAD GitHub Actions must still pass WordPress 6.7/latest, PHP 7.4/8.3, WPCS, Theme Check, real WordPress+Chromium and reproducible packaging. No CSS, JS, plugin, analytics or production-site dependency is introduced.
