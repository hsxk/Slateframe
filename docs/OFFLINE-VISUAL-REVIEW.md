# Offline exact-HEAD visual review index

The browser Actions artifact is evidence, **not** a visual pass. A reviewer must
open actual WordPress/Chromium PNGs and check Appearance compact/default/spacious,
320/375/390/412/768/1440/1920 layouts, RTL/CJK, 400% and forced colors,
Gutenberg, Photography/Lightbox, Portfolio, Knowledge, Article, Header, Search,
Forms and Footer. The Photography workflow has its own artifact and manifest;
review it separately rather than pretending the browser index covers it.

After downloading the **successful exact PR HEAD** `slateframe-browser` artifact
and extracting its `test-artifacts/screenshots/` directory, run:

```bash
python3 bin/visual-review-index.py /path/to/test-artifacts/screenshots \
  0123456789abcdef0123456789abcdef01234567 \
  --output /path/to/test-artifacts/visual-review.html
```

Replace the sample SHA with the actual 40-character PR HEAD. The index verifies
`HEAD_SHA.txt`, the complete `BROWSER_SCREENSHOT_INVENTORY.json`, the
`VISUAL_EVIDENCE.json` acceptance subset, and all screenshot SHA-256 values,
byte counts, dimensions, chunk framing and CRC. It rejects malformed names, duplicates, missing or
oversized files, symlinks (including ancestors), hardlinks and non-regular files.
File opens use anchored `O_NOFOLLOW` descriptors on POSIX to resist path swaps.
JSON manifests reject duplicate keys, non-finite constants, inconsistent filename
metadata and duplicate visual-subset records. The PNG parser also rejects
invalid IHDR color/depth combinations, unknown critical chunks and invalid
palette/IDAT ordering; the CI browser gate remains responsible for decoding
raster pixels.

The generated HTML groups compact/default/spacious Appearance separately and
includes every inventory image in its verified source set. It is offline, read-only and uses **only local PNGs**; it has no
JavaScript, remote styles, fonts, analytics or network requests. Images remain
unchanged. Categories show a deterministic representative selection, with a
24-image-per-category default to keep the review manageable. Every verified
image omitted from the thumbnail selection remains reachable through a native
keyboard-accessible **Browse remaining** disclosure and full-resolution link.
The representative selection reserves mobile and desktop captures across the
seven supported viewport widths before filling remaining slots, so a large
390px set cannot hide 1440px/1920px evidence. Screenshots listed in
`VISUAL_EVIDENCE.json` are always rendered as **Required visual evidence**
thumbnails, even when their count exceeds `--limit-per-group`. The limit applies
to optional thumbnails only after all acceptance evidence is shown. This avoids
silently hiding a required screenshot behind the disclosure, but does not
constitute human visual approval.
Use `--limit-per-group 10000` to display all thumbnails. The output must live **outside**
the verified screenshot directory so that it does not invalidate the original
artifact manifest. Clicking a thumbnail opens the full-resolution PNG.

The review index is an aid for human inspection, not a screenshot generator,
automated visual assertion or CI acceptance substitute. The reviewer still
checks exact-SHA GitHub Actions, the separate Photography artifact, the release
ZIP and main merge SHA before approving a PR. No production WordPress site is
accessed by this tool.


## Photography runtime: separate exact-HEAD review

The successful Photography runtime Actions artifact is **not** the Browser
artifact. Confirm that both workflows correspond to the same exact PR HEAD.
Inspect the ZIP member paths before extracting the isolated
test-artifacts/photography-lightbox/ directory, then run:

~~~bash
python3 bin/photography-review-index.py /path/to/test-artifacts/photography-lightbox \
  0123456789abcdef0123456789abcdef01234567 \
  --output /path/to/test-artifacts/photography-review.html
~~~

Replace the sample SHA with the actual full PR HEAD. The new index validates
the Photography manifest's exact commit, every PNG SHA-256, dimensions, CRC
and chunk framing, rejecting unlisted or missing files, symlinks, hardlinks,
duplicate JSON keys and invalid metadata. It provides accessible local
full-resolution links and a deterministic bounded thumbnail overview with
no JavaScript or remote requests. The HTML output must be **outside** the
verified evidence directory.

The optional manifest pixel_sha256 is validated for syntax, but this
standard-library-only index does **not** recalculate decoded pixel hashes.
The successful Photography runtime and a real raster decoder remain
authoritative for that check. Manually inspect the 320/390/1440/1920 Gallery,
portrait/landscape lightbox, RTL navigation, close-button focus and safe areas.
A generated HTML index is not a visual pass or a substitute for the
exact-SHA Actions, real WordPress browser evidence or release ZIP review.


The Photography workflow now runs this validator against its **real** generated
artifact on the exact checked-out HEAD, before uploading evidence. The generated
photography-review.html is included alongside the original screenshots. The
known Playwright JSON results file is permitted inside the Photography evidence
directory, but unknown files, linked reports and invalid screenshots are not.
The HTML remains a review aid; the workflow cannot certify human visual quality.


## Browser Actions integration

The real WordPress/Chromium Browser smoke job now runs the offline visual review index **after** the screenshot inventory and required evidence have been verified. The job binds the generator to the immutable checkout HEAD, requires a nonempty `test-artifacts/browser-review.html`, and uploads that HTML next to the unmodified screenshot directory in the `slateframe-browser` artifact. Relative links continue to work when the archive is extracted.

This is a blocking CI generation and integrity check, **not** an automatic visual approval. Reviewers must download the exact-HEAD artifact, open the index and inspect full-resolution Appearance, Photography, Portfolio, Knowledge, Article, header/search/forms/footer, RTL/CJK, Gutenberg and high-zoom/forced-colors captures before merging. The standalone Photography workflow retains its separate index and gate.
