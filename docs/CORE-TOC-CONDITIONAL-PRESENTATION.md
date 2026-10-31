# Conditional native Core Table of Contents presentation

Slateframe retains WordPress Core ownership of Table of Contents headings, anchor IDs, link text, keyboard navigation and block serialization. It does not integrate or depend on any third-party TOC plugin.

## Runtime boundary

The shared `assets/css/reading.css` continues to style the TOC container, list spacing and indentation. Its 44px, wrapping and bounded link treatment is now isolated in `assets/css/core-table-of-contents.css` (201 bytes). `slateframe_register_core_toc_styles()` registers that file with `wp_enqueue_block_style('core/table-of-contents', ...)` **only if WordPress registers the native block**; older supported WordPress releases are not forced to provide it. Gutenberg receives the same stylesheet through `add_editor_style()`.

This change reduces the always-loaded singular reading stylesheet by 200 bytes while retaining the identical selector and declarations when a native TOC is rendered. It creates no new front-end JavaScript, block type, content filters, URL handling or plugin dependencies.

## Strict acceptance

`tests/verify_core_toc_css.py` continues to parse the exact unconditional Core link selector and verify its full declaration contract. The checker now reads the conditional file, explicitly rejects a duplicate shared-reading link rule, and still rejects legacy plugin markers, missing files, symlinks, conditional-only declarations, missing 44px tokens and editor parity regressions. The negative tests remain intact and add checks for missing conditional CSS and duplicate shared styles.

`quality.yml` enforces a 300-byte cap and includes the new file in required-file checks. The original 7,000-byte reading cap and all aggregate runtime budgets remain unchanged. Real WordPress/Gutenberg parity and exact-SHA Actions must succeed before merging. Manual Safari/VoiceOver and Firefox review remains necessary for release.
