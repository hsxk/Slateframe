# Core article print presentation

Slateframe uses a WordPress-enqueued, print-media-only CSS stylesheet at `assets/css/print.css`. It is generic theme presentation, not a PDF exporter, content service, analytics layer, or plugin dependency. Screen Appearance and interactive Gutenberg presentation remain unchanged.

## Core-first behavior

- Print a high-contrast white page with black article content, regardless of screen color mode.
- Omit navigation, site chrome, comments, related links, pagination, and the native lightbox overlay; preserve semantic article content, images, figures, tables, quotations, captions, code, and links.
- Remove the viewport-based main minimum height and screen width constraints without enlarging boxes beyond the printable area.
- Wrap long code tokens, avoid clipped table scroll areas, and preserve native HTML and WordPress Core table structures.
- Suppress Core Cover overlays and excessive Spacer heights while retaining Cover text and natural image proportions.
- Scale portrait Cover media and featured images to a maximum 18 cm on paper, without cropping.
- Keep headings with following material and keep figures and table rows together where supported by the browser's print fragmentation engine.
- Native Details remain native: expand a closed disclosure before printing if the hidden text must be included; CSS does not forcibly open it.
- Use RTL-compatible logical properties and allow CJK and long multilingual table tokens to wrap.

## Evidence and limits

`tests/browser/print-presentation.spec.js` runs against a **real published WordPress article** at seven viewports: 320, 375, 390, 412, 768, 1440, 1920. Mobile viewports exercise RTL, a dark appearance, and a 200% root font. The browser test asserts computed print styles, checks screen-mode isolation, and writes 390px/1440px print-media Chromium screenshots for CI artifact review. The Theme quality workflow requires both before packaging.

Browser fragmentation hints cannot guarantee pagination for material larger than the physical page. Verify A4/Letter margins and final print/PDF page breaks separately before release. No additional JavaScript, commercial feature, third-party runtime, or production deployment is introduced.
