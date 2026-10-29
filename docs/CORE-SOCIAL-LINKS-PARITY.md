# Native Social Links control parity

Slateframe preserves the WordPress Core `core/social-links` and `core/social-link` service catalog, accessible names, SVG icons, URL behavior, block serialization and authored visual styles. A small conditional stylesheet ensures 44px touch/keyboard targets, bounded wrapping and visible forced-colors focus without introducing custom icons, social API integrations, JavaScript or external destinations.

The real WordPress/Chromium fixture uses only same-page anchor links. It checks 320/375/390/412/768/1440/1920px, LTR/RTL, 16/32/64px roots, actual link hit rectangles, keyboard focus, Axe WCAG 2.0/2.1 A/AA, and screenshots at 390/1440px plus RTL 400% forced-colors. Gutenberg serializes and parses native services without changing the editor post. Review the exact-HEAD Actions evidence before merging.
