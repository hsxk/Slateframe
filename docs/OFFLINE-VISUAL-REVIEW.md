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

The generated HTML groups compact/default/spacious Appearance separately and
includes every inventory image in its verified source set. It is offline, read-only and uses **only local PNGs**; it has no
JavaScript, remote styles, fonts, analytics or network requests. Images remain
unchanged. Categories show a deterministic representative selection, with a
24-image-per-category default to keep the review manageable; use
`--limit-per-group 10000` to list everything. The output must live **outside**
the verified screenshot directory so that it does not invalidate the original
artifact manifest. Clicking a thumbnail opens the full-resolution PNG.

The review index is an aid for human inspection, not a screenshot generator,
automated visual assertion or CI acceptance substitute. The reviewer still
checks exact-SHA GitHub Actions, the separate Photography artifact, the release
ZIP and main merge SHA before approving a PR. No production WordPress site is
accessed by this tool.
