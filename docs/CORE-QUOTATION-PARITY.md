# Core Quote and Pullquote parity

Slateframe uses the WordPress Core Quote and Pullquote blocks as authored. The theme may present their borders, spacing and type, but does not own quotations, citations, block serialization, or editor content. In particular, RTL and CJK text should reflow naturally; a long source citation must not expand the document beyond the viewport.

The translatable `slateframe/editorial-pullquote` inserter pattern supplies an editable Core Pullquote and source placeholder, without custom markup or content ownership. Its registered content is inserted into a disposable page and captured separately for visual review.

The disposable WordPress + Chromium fixture covers both native blocks at 320, 375, 390, 412, 768, 1440 and 1920 CSS pixels, in LTR and RTL. It checks content containment, 200% and 400% root text, forced-colors keyboard focus and print reflow, WCAG 2.0/2.1 A/AA Axe results, and captures exact-SHA visual evidence at 390/1440 plus the 390 RTL zoom case. An authenticated Gutenberg check serializes and parses each native block without modifying the editor post. The current Gutenberg Core Quote uses a `citation` attribute and native nested Core Paragraph blocks; a `value` attribute on Quote silently drops its text. The regression creates the actual nested block, requires the paragraph to survive serialization, and checks the citation. Core Pullquote retains its own `value`/`citation` attributes. This reflects real WordPress behavior rather than weakening the round-trip assertion.

Do not substitute a custom quote renderer or scripts for Core. Manual visual review remains necessary; an automated geometry or Axe pass is not a visual approval.
