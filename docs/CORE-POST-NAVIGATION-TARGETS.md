# Native Core Post Navigation Link controls

Slateframe styles the **WordPress Core Post Navigation Link** block as a small conditional presentation layer. WordPress owns adjacent-post resolution, translations, link semantics, title display, optional labels and decorative arrows. The classic PHP post navigation is independent and unchanged.

## Spatial and accessibility contract

- Every native previous/next anchor has a bounded 44px minimum inline and block target using `--slateframe-control`, including short labels and links with decorative arrows.
- Logical dimensions and `overflow-wrap:anywhere` keep long Japanese/Chinese/Arabic or unbroken titles inside 320–1920px LTR and RTL viewports. An external `post-navigation-link__label` is left as native text rather than being promoted to a second, misleading interactive target.
- Author-supplied Core typography, background, spacing and arrow options remain authoritative. The theme does not rewrite rendered HTML, query adjacent posts itself, or add JavaScript.
- `wp_enqueue_block_style('core/post-navigation-link', ...)` limits CSS to documents containing the block, including synced patterns and block regions. `add_editor_style()` loads the same CSS for Gutenberg parity.
- Native `:focus-visible` and forced-color focus outlines remain in place.

## Runtime evidence

`tests/browser/core-post-navigation-targets.spec.js` creates three real dated WordPress posts, checks that the two Core links resolve to the adjacent posts, then tests 320/375/390/412/768/1440/1920px, LTR/RTL, 100%/200%/400% root font sizing, Axe, keyboard focus, forced colors, screenshots and actual navigation. All fixture posts are deleted in `finally`.

The exact-HEAD `slateframe-browser` artifact should include `core-post-navigation-320-ltr.png`, `core-post-navigation-390-rtl.png`, `core-post-navigation-1440-ltr.png`, and `core-post-navigation-390-rtl-forced-colors.png`. Inspect those pixels before visual signoff. Automated Chromium does not replace Safari/VoiceOver and Firefox manual review.
