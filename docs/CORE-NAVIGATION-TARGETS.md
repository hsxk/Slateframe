# Native Core Navigation controls

Slateframe leaves WordPress Core Navigation, its overlay, submenu, and keyboard behavior owned by WordPress. The classic theme header keeps its own independent navigation styling. This presentation layer applies only when an author inserts `core/navigation` in content or a block region.

## Bounded controls

- Native links, submenu toggles, and responsive open/close controls have minimum 44px targets through `--slateframe-control`, including the WordPress 7.0+ customizable overlay close block.
- Logical inline/block dimensions and `overflow-wrap:anywhere` allow long Japanese, Chinese, Arabic, and unbroken labels to reflow in LTR and RTL. Items may shrink within Core flex containers without viewport-width hacks.
- Existing theme `:focus-visible` remains the focus indicator. Core retains its own accessible names, menu semantics, and interactivity.
- `wp_enqueue_block_style( 'core/navigation', ... )` conditionally loads the small CSS only when Core Navigation renders. Gutenberg receives the same CSS through `add_editor_style()`.

## Acceptance

`tests/browser/core-navigation-targets.spec.js` creates a real published WordPress page and checks 320/375/390/412/768/1440/1920 widths, both directions, 100%/200%/400% root text, native overlay controls, keyboard focus, Axe, forced colors, and exact-SHA Chromium screenshots. The test deletes its fixture even after failure.

Automated Chromium checks do not replace manual Safari/VoiceOver and Firefox review. The theme adds no navigation interception, custom content ownership, extra JavaScript, or plugin dependencies.
