# Core archive heading and term description parity

Slateframe preserves WordPress Core ownership of `core/query-title` and `core/term-description`: archive query resolution, term content, semantics, translation and saved block serialization stay in Core. The theme adds only tiny conditional styles to contain long unbroken headings and multilingual description text. Both styles are registered with `wp_enqueue_block_style()` and included in editor styles, with no new runtime JavaScript, external service or custom query logic.

Real WordPress/Chromium regression uses the native dynamic blocks to enqueue their styles and a neutral rendered-class fixture to exercise long Japanese, Chinese, Arabic and unbroken Latin text without depending on archive data. Seven widths (320–1920), both text directions and 16/32/64px root sizes are checked for document and text-fragment overflow. Evidence includes 390/1440 LTR/RTL 200% screenshots, 390 RTL 400% forced-colors screenshots, Axe checks, and authenticated Gutenberg serialize/parse round trips. The fixture tests presentation, not archive query semantics.

Inspect the screenshots from the exact HEAD Actions run before merging. The static and browser contracts must not be weakened to accommodate failures.
