# Core Gallery caption alignment QA

The registered photo-sequence style and the class-only `slateframe-gallery-sequence` variant must keep portrait media and captions aligned to the same inline width. Ordinary Core Gallery, Contact Sheet and Diptych must remain unaffected.

The Photography workflow must create real WordPress native, class-only and plain negative-control fixtures. Missing fixture URLs are errors, not skips. Run the native, class-only, raster/Lightbox and caption-geometry Playwright specs. Require normal and long-caption screenshots for both variants at 390px and 1440px.

Inspect the exact candidate SHA's real WordPress + Chromium screenshots. Verify long Chinese/Japanese/Arabic/English captions at 400% root font size in LTR/RTL, forced-colors and reduced-motion. PNG existence and dimensions are not substitutes for actual visual review. No production-site dependency or extra runtime JavaScript.
At 400% text sizing, do not force a caption to the reduced width of a viewport-height-limited portrait image. A bounded 16ch minimum figure width lets the caption reflow while the image stays centered. Normal mobile images and captions must still retain width parity; tests assert both states independently.
