# CJK heading tracking and Gutenberg parity

Slateframe retains tighter tracking for Latin display headings, but Japanese, Chinese and Korean headings use natural glyph spacing. The rule follows inherited or explicit HTML language, without automatic detection or new dependencies.

Chromium does not accept a comma-separated language list inside one `:lang()` selector; use `:is(:lang(zh),:lang(ja),:lang(ko))`. The Gutenberg post-title selector has higher specificity, so the editor canvas needs a dedicated override. A shared 640px media query is consolidated to stay under the existing 38 KB runtime budget without raising thresholds.

Tests cover seven viewport widths, LTR/RTL, zoom, forced colors, Latin-vs-CJK tracking, and real WordPress editor parity. Release acceptance requires same-SHA Actions and screenshot inspection.

The real-editor screenshot test dismisses WordPress Core's welcome guide before capturing evidence. Otherwise a modal can cover the CJK fixture while computed-style assertions still pass. The editor fixture verifies inherited Japanese language, explicit Traditional Chinese and Korean language, and English overrides within Japanese content. It checks the dialog is hidden immediately before the screenshot; no production JavaScript or theme CSS is added for this test-only correction.

The editor regression targets inherited Japanese titles using `:not([lang])`, separating those headings from an explicit `lang="en"` child. This is a selector correction only: it prevents strict-locator ambiguity while preserving both CJK and Latin computed-spacing assertions.
