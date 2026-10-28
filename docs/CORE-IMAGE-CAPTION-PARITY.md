# Native Core Image caption and link parity

Slateframe leaves `core/image` image selection, media links, attachment URLs, alt text, intrinsic aspect ratio, crop settings, captions, lightbox behavior and editor serialization to WordPress Core. The conditional stylesheet only prevents an image figure and its caption from exceeding narrow containers, including long unbroken mixed-script captions. It does not set image dimensions, override authored alignment, invent image links, or add JavaScript.

## Acceptance

The disposable real WordPress fixture imports the theme's local screenshot into the media library and renders linked and unlinked native Image blocks. Tests preserve media href, alt text, image decoding, original caption text and link focus, and measure figure/image/caption bounds at 320/375/390/412/768/1440/1920px, LTR/RTL, 200%/400% font scale, Axe, forced colors and keyboard focus. A 404 page must not load the conditional asset. Gutenberg serializes/parses three native image variations without mutating the editor. Tests delete both the temporary post and imported attachment.

Inspect the exact-HEAD WordPress/Chromium screenshots before merge. Safari/VoiceOver and Firefox, including native lightbox and translated captions, remain manual release checks. Do not confuse a screenshot inventory with actual visual acceptance.

## Complete computed 400% acceptance

The real WordPress Image fixture checks 320/375/390/412/768/1440/1920px × LTR/RTL × computed root text 16/32/64px (42 combinations), preserving linked and unlinked native media, original alt/caption text, intrinsic image dimensions and editor serialization. The test checks actual computed root and caption font sizes, containment, focus outline and the absence of document overflow. It does not shrink authored text or impose a new image presentation.

Three 390×900 viewport screenshots at 400% are mandatory: LTR, RTL, and RTL forced colors, with the real media link scrolled into view and focused. The CI evidence gate checks PNG signature, IHDR dimensions, chunk CRCs, image data, IEND, and rejects linked, missing, corrupt or wrong-sized captures. These additions are test-only and do not change runtime CSS/PHP/JS. Actual screenshots must be downloaded and visually inspected for the exact successful Actions HEAD before merge.
