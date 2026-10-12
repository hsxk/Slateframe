# Native Core Gallery release acceptance

Slateframe uses the WordPress Core Gallery and Image blocks. The Photo sequence block style is presentation only: it must not require a plugin, custom gallery block, remote image service, or runtime JavaScript.

## Automated acceptance

The Photography runtime workflow installs a real WordPress site, uploads raster landscape, portrait, and square fixtures, serializes an independent `core/gallery` block with the `is-style-slateframe-photo-sequence` class, and rejects invalid `parse_blocks()` output before launching Chromium. This is intentionally separate from the contact-sheet fixture: mutating a CSS class on an existing DOM element is not a substitute for testing saved Core block markup.

Run `npx playwright test tests/browser/photography-raster-lightbox.spec.js tests/browser/photography-native-sequence.spec.js` against that fixture. Validate 320, 375, 390, 412, 768, 1440, and 1920 CSS-pixel widths; native media dimensions and `srcset`; desktop two-column/mobile single-column layout; readable multilingual captions; RTL and 200% text; keyboard Enter/Escape and focus return; 44px lightbox controls; and axe WCAG A/AA.

## Visual evidence

Review the **exact HEAD SHA** Actions artifacts, not an older green run. Check Appearance compact/default/spacious, Photography/Lightbox, Portfolio, Knowledge, article, header, search/forms, and footer at representative mobile/desktop widths. The independent Gallery capture is a **full-page WordPress screenshot**: element-only screenshots can inadvertently include a sticky header across the gallery when Playwright scrolls the element into view. Do not interpret that capture artifact as a layout defect without reproducing it in the full page.

No screenshot or local test is sufficient to approve a new SHA without all required Actions passing. Do not loosen static budgets or omit failing test cases to make the build green.
