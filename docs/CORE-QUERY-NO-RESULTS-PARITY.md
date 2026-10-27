# Native Query Loop No Results parity

Slateframe keeps the WordPress Core `core/query-no-results` block in charge of deciding when the authored fallback appears. The theme does not replace queries, alter search behavior, inject fallback text, or hide the block in the editor.

The tiny block-conditional stylesheet uses logical sizing, existing spacing/rule tokens, and long-word wrapping; it is shared with Gutenberg and has no JavaScript. It does not introduce an additional landmark, focus stop, or fake result. Core remains responsible for block wrapper attributes, colors, nested buttons, pagination, and author-controlled fallback content.

## Disposable WordPress acceptance

A published post and a published page containing **two native Query Loops** exercise the same post type with different search strings. The matching loop must render the post and omit its fallback; the unmatched loop must render only its authored No Results paragraph and native Button. The test checks Core markup, no phantom links or posts, 44px button target, conditional CSS loading, seven widths (320/375/390/412/768/1440/1920), LTR/RTL, mixed CJK/Arabic/long text, 200%/400% text, keyboard focus, Axe, forced colors, screenshots, 404 isolation and authenticated Gutenberg roundtrip. Both posts are deleted in `finally`.

Do not treat a passing unit test or a generated screenshot file list as visual acceptance: inspect the exact-HEAD WordPress/Chromium artifact and verify all required Actions success. Safari/VoiceOver, Firefox, and real locale packs remain manual release gates.

## Verified large-text and forced-colors evidence

The disposable WordPress fixture now applies 16/32/64px root sizes with the shared
computed-style gate (including `!important`, two animation frames and actual
LTR/RTL computed direction), rather than trusting a CSS declaration that a Core
or plugin rule may override. At 390px it captures both LTR and RTL 400% No
Results states and an additional RTL 400% forced-colors keyboard-focus state.
The adjacent Core Search no-button/button-only fixture uses the same computed
scale gate and captures both 390px directions at 400%. Theme quality requires
all five PNGs, so an absent image cannot be replaced by unrelated screenshots.
Keep 44px targets, focus visibility, horizontal overflow, and Axe assertions;
do not alter Core's query or search behavior to satisfy the test.
