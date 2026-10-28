# Core metadata and author 400% visual acceptance

Slateframe keeps WordPress Core `post-terms`, `post-author-name`, and
`post-author-biography` as native blocks. It does not replace taxonomy links,
author links, biography text, or Gutenberg serialization with custom markup.

## Runtime coverage

The disposable WordPress fixtures exercise seven viewports (320, 375, 390, 412,
768, 1440, 1920), LTR and RTL, 100% and 200% root text, and 400% at 390px.
The shared `setRootTextScale` helper verifies the **computed** root font size
(16/32/64px) and direction rather than trusting an inline style assignment.
Long Japanese, Chinese, Arabic and unbroken Latin labels must reflow without
document horizontal overflow. Interactive native links retain their minimum
44px target, keyboard focus and forced-colors outline. The biography remains
noninteractive text. Existing Axe checks, native links, disposable fixture
cleanup and Gutenberg roundtrips remain required.

## Evidence and release gate

For each block, the Browser smoke job must produce real 390×900 viewport
captures for LTR 400%, RTL 400%, and RTL 400% forced colors (with focused
links where applicable). Nine files are checked for existence, PNG signature,
IHDR CRC and exact dimensions by
`tests/verify_core_metadata_zoom_evidence.py`. Static tests reject missing,
corrupt, wrong-size and non-PNG evidence.

A successful static test is not a visual pass: inspect the exact PR HEAD SHA's
WordPress/Chromium artifacts, including the metadata captures and representative
Appearance, Photography/Lightbox, Portfolio, Knowledge, Article, Header,
Search, Forms, Footer and Gutenberg screens. Merge only after every necessary
Actions job succeeds and the distributable ZIP is audited.

No runtime PHP/CSS/JS or third-party dependency is introduced by this test
slice. Manual Safari/VoiceOver and Firefox checks remain separate release work.
