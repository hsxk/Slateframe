# Portfolio full-page screenshot stability

Core featured images may use native lazy loading. A Playwright `networkidle` navigation does not guarantee that images below the fold have loaded, so a full-page screenshot can capture a gray placeholder in one Actions run and the image in another even when theme runtime files are unchanged.

The 320px, 200% text-resize Portfolio evidence now scrolls each native Query Loop featured image into view, checks its loaded intrinsic dimensions, waits for image decoding, restores the scroll position, and only then captures the full-page screenshot. This is a test-only evidence gate: it does not change WordPress markup, image loading strategy, theme JS, or performance budgets. Missing/broken fixture images cause the test to fail rather than silently passing with placeholders.

The prior and current exact-SHA Photography evidence differed in only one 390px image by at most five color-channel values. The larger Portfolio screenshot difference came from an image not yet loaded, not a changed theme stylesheet. Always compare the real screenshots before attributing visual differences to runtime regressions.

## Tall 400% Portfolio evidence (2026-10-27)

The real WordPress/Chromium Browser artifact for commit `56c4b88fd1e5aec85006d204b807a3fca607eedd` contains two **390 × 22,358** full-page Portfolio screenshots (LTR and RTL forced-colors). Its Browser smoke assertions passed, but the post-test PNG inventory rejected the legitimate 22,358px height against a stale 20,000px limit. Cropping or omitting cards would lose evidence. The validator now permits up to 24,000px height **only while retaining** the 25,000,000-pixel raster ceiling, 20MiB file limit, 16MiB compressed IDAT ceiling, full PNG CRC/scanline validation, and exact-HEAD manifest hashing. The four contextual Portfolio full-page screenshots also receive exact viewport-width validation, so a desktop crop cannot masquerade as mobile/RTL evidence. Unit tests exercise the real 22,358px case and rejection above the height cap and pixel budget.

This is an evidence-validator correction, not a runtime theme change or a waiver of visual inspection. Inspect the exact new SHA's full-page and element screenshots before merging.
