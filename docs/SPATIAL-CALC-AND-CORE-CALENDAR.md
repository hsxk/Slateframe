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
The heading-offset browser assertion runs on a singular WordPress post, since
`reading.css` is intentionally not enqueued on the home archive. The browser
test checks both halves of that conditional loading contract.

A native Core Calendar is a seven-column semantic table. Translated weekday
labels can overflow on phones. Slateframe scrolls its container in both the
frontend and Gutenberg, without changing table display semantics, WordPress
Calendar data or injecting JavaScript. A 700px-wide table fixture checks
containment across the same widths and accessibility modes. Browser assertions
verify native `table` display, computed heading no-wrap, real horizontal scroll
travel in LTR and RTL, zoom and forced colors. Localized headings remain on
one line within the scrolling Calendar in both frontend and Gutenberg.

Release acceptance requires the exact PR HEAD's Theme quality and Photography
runtime quality Actions success and inspection of actual WordPress/Chromium
screenshots across Appearance compact/default/spacious, mobile/desktop,
Photography/Lightbox, Portfolio, Knowledge, article, header, forms and footer.
