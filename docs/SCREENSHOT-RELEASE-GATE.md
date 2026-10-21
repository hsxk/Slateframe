# WordPress.org screenshot release gate

The root `screenshot.png` is a **public theme asset**, not a private test
artifact. It must be a single-frame, non-interlaced, 1200 × 900 PNG. The
release ZIP is built from committed `HEAD` files only; the screenshot is
validated before ZIP creation, with the staged manifest rechecked afterward.

## Export and review

1. Export a static PNG from the actual Slateframe theme preview, using a
   neutral demo site. Do not include real site URLs, names, accounts, tokens,
   analytics identifiers, or user content in the image.
2. Remove EXIF, XMP, free-text, compressed-text and creation-time metadata
   (`eXIf`, `iTXt`, `tEXt`, `zTXt`, `tIME`). Preserve normal color-space
   information such as `sRGB` and `gAMA` if needed. Do not use animated PNG.
3. Keep PNG transparency standards-compliant: indexed `tRNS` must follow a
   palette and cannot exceed its entry count; grayscale/truecolor transparency
   has fixed lengths **and samples within the IHDR bit depth**; alpha color types cannot carry `tRNS`.
4. Run `python3 bin/check-screenshot.py screenshot.png` and the full local
   quality suite on the **committed** candidate. The validator also rejects
   linked files, oversized input, invalid PNG chunks, CRC failures, malformed
   scanlines, unexpected pixel dimensions and compressed payload corruption.
   On POSIX CI it opens **each parent directory and the screenshot itself**
   through anchored, no-follow file descriptors, rejecting a parent symlink
   swapped in after preflight. It fails closed when secure `openat` support is
   unavailable; do not replace that protection with a normal path-based open.
5. Build twice from the same commit with the same `SOURCE_DATE_EPOCH`, compare
   the resulting ZIP SHA256 hashes, and inspect the ZIP manifest. Do not
   publish a screenshot or ZIP from a dirty checkout.
6. Wait for required GitHub Actions to succeed on the exact PR HEAD. Inspect
   the WordPress+Chromium artifact screenshots for Appearance compact/default/
   spacious, 390px and 1440px, 320–1920px responsive checks, RTL/CJK, editor,
   Photography/Core lightbox, Portfolio, Knowledge, article, header, search,
   forms, footer, keyboard focus, zoom and forced colors before merging.

The validator is intentionally strict: if an image editor adds private
metadata or animation chunks, re-export a clean static PNG instead of
loosening the release check. These checks protect the distributable screenshot;
they do not replace a human visual review of the actual image or full theme.
