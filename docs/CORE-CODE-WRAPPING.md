# Native Core code and responsive reading

WordPress Core Code and Preformatted blocks wrap long lines by default. Slateframe preserves their built-in semantics and does not add unnecessary tabindex stops to these normally wrapping blocks. The theme's reading measure and media containment should keep very long identifiers from widening the page.

The real WordPress showcase includes long unbroken Code and Preformatted blocks. Chromium verifies their rendered white-space behavior, semantic markup, RTL/CJK containment, 320/375/390/412/768/1440/1920px widths, 200% text zoom and forced-colors screenshots. Code source direction remains left-to-right in RTL, while Preformatted follows the document.

The compact mobile navigation separately uses bounded scrolling and stable scrollbar space. Its multilingual 200%-zoom fixture verifies the final menu link remains keyboard reachable. Manual assistive-technology review is still required before release.
