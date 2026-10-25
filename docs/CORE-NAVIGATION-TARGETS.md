# Native Core Navigation controls

Slateframe leaves WordPress Core Navigation, its overlay, submenu, and keyboard behavior owned by WordPress. The classic theme header keeps its own independent navigation styling. This presentation layer applies only when an author inserts `core/navigation` in content or a block region.

## Bounded controls

- Native links, submenu toggles, and responsive open/close controls have minimum 44px targets through `--slateframe-control`, including the WordPress 7.0+ customizable overlay close block.
- Center Core buttons with `align-items`/`justify-content` only; never force their `display` property. WordPress hides the mobile-only overlay opener at desktop widths, and overriding it with `display:grid`/`inline-grid` would create a duplicate hamburger beside the expanded menu. Real WordPress browser coverage checks hidden desktop and visible mobile states.
- Logical inline/block dimensions and `overflow-wrap:anywhere` allow long Japanese, Chinese, Arabic, and unbroken labels to reflow in LTR and RTL. Items may shrink within Core flex containers without viewport-width hacks.
- The native `wp-block-navigation__container` flex item must also have a zero inline minimum and a 100% maximum: without those bounds WordPress can retain a 774px min-content list on a 320px phone even when each link itself wraps. Keep Core's authored wrap/overlay semantics. Core explicitly sets `overflow-wrap:break-word` on its nested label span, so Slateframe also sets `overflow-wrap:anywhere` on that label; otherwise the flex container shrinks but its long unbroken text still overflows.
- WordPress Core supplies the default opaque overlay surface and owns authored/custom overlay backgrounds. Slateframe must not override those colors. Core's fade-in must finish before capturing visual evidence: a screenshot taken mid-animation can falsely show the underlying multilingual links through the modal.
- Existing theme `:focus-visible` remains the focus indicator. Core retains its own accessible names, menu semantics, and interactivity.
- `wp_enqueue_block_style( 'core/navigation', ... )` conditionally loads the small CSS only when Core Navigation renders. Gutenberg receives the same CSS through `add_editor_style()`.

## Acceptance

`tests/browser/core-navigation-targets.spec.js` creates a real published WordPress page and checks 320/375/390/412/768/1440/1920 widths, both directions, 100%/200%/400% root text, settled and opaque native overlay controls, keyboard focus, Axe, forced colors, and exact-SHA Chromium screenshots. The test deletes its fixture even after failure.

Automated Chromium checks do not replace manual Safari/VoiceOver and Firefox review. The theme adds no navigation interception, custom content ownership, extra JavaScript, or plugin dependencies.
