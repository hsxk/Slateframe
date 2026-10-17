# Portfolio full-page screenshot stability

Core featured images may use native lazy loading. A Playwright `networkidle` navigation does not guarantee that images below the fold have loaded, so a full-page screenshot can capture a gray placeholder in one Actions run and the image in another even when theme runtime files are unchanged.

The 320px, 200% text-resize Portfolio evidence now scrolls each native Query Loop featured image into view, checks its loaded intrinsic dimensions, waits for image decoding, restores the scroll position, and only then captures the full-page screenshot. This is a test-only evidence gate: it does not change WordPress markup, image loading strategy, theme JS, or performance budgets. Missing/broken fixture images cause the test to fail rather than silently passing with placeholders.

The prior and current exact-SHA Photography evidence differed in only one 390px image by at most five color-channel values. The larger Portfolio screenshot difference came from an image not yet loaded, not a changed theme stylesheet. Always compare the real screenshots before attributing visual differences to runtime regressions.
