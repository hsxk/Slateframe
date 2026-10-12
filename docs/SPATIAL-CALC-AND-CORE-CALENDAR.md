# Spatial arithmetic and Core Calendar parity

CSS custom properties may make CSS.supports() report an apparently valid
calc() expression while the declaration becomes invalid at computed-value
time. Binary + needs whitespace on both sides. The former unspaced sums
silently invalidated the hero lower margin, pagination upper margin and
heading anchor scroll offset in Chromium.

The repaired rules retain existing Spatial System tokens and bounded
Appearance settings, with no new tokens or pixel constants in the runtime.
Static tests reject unspaced custom-property arithmetic; browser tests
check computed styles in WordPress at 320/375/390/412/768/1440/1920px,
LTR and RTL, plus 390px RTL, 200% root text size and forced colors.

A native Core Calendar is a seven-column semantic table. Translated weekday
labels can overflow on phones. Slateframe scrolls its container in both the
frontend and Gutenberg, without changing table display semantics, WordPress
Calendar data or injecting JavaScript. A 700px-wide table fixture checks
containment across the same widths and accessibility modes.

Release acceptance requires the exact PR HEAD's Theme quality and Photography
runtime quality Actions success and inspection of actual WordPress/Chromium
screenshots across Appearance compact/default/spacious, mobile/desktop,
Photography/Lightbox, Portfolio, Knowledge, article, header, forms and footer.
