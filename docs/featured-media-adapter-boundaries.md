# Featured media adapter boundaries

Slateframe renders the WordPress Core featured-image result in its editorial hero figure. The theme does not own the image, change attachment metadata, require a gallery plugin, or replace Core's image markup.

A valid image is still processed by Core's `WP_HTML_Tag_Processor` to preserve its responsive attributes and set `loading=eager`, `decoding=async`, and `fetchpriority=high` for the main hero. The existing caption remains filtered through Core's `wp_kses_post()`, preserving translated and CJK text.

The `wp_get_attachment_image` filter may be extended by other code. When it returns `false`, `null`, an array, an error object, blank text, or text with no `img` element, the theme now renders no hero rather than passing a non-string to the HTML processor or outputting an empty figure. The post's normal content is unaffected.

Run `python3 -m unittest tests/test_featured_media_boundaries.py` or `php tests/fixtures/featured-media-boundaries.php.fixture` for isolated regression checks. These tests do not access a database or production site. Exact-head Actions, real WordPress+Chromium browser checks, PHP compatibility, WPCS, Theme Check, and packaging remain required before merge.

## Filtered image HTML and output safety

WordPress filters can replace `wp_get_attachment_image()` output after Core has escaped its original attributes. The hero therefore sanitizes **filter-provided HTML before processing it** with Core `wp_kses_post()`, rather than trusting arbitrary event handlers or script elements. Core's post KSES allowlist does not retain all browser image priority/decoding attributes; `WP_HTML_Tag_Processor` reapplies the fixed `loading`, `decoding`, and `fetchpriority` values only **after** sanitization, so those attributes survive without admitting untrusted markup. This keeps Core `srcset`, `sizes`, translated `alt`, eager loading, asynchronous decoding, and high fetch priority without introducing a new media abstraction. The isolated PHP fixture now verifies this output boundary with intentionally unsafe filtered HTML; it is not a replacement for the real WordPress browser gate.

## Source-less filtered hero regression

A filtered `<img>` without a usable `src` **and** without a nonblank `srcset` is not a visible featured image. Slateframe now suppresses the entire hero figure and its caption after Core KSES, instead of leaving a blank hero on a post or Page. A valid `srcset`-only image remains supported, with the responsive candidates and the fixed high-priority attributes intact. The isolated runtime fixture covers missing, empty, whitespace-only and combined blank attributes, plus a CJK `srcset`-only image. This behavior matches the separate attachment-page image boundary without introducing a custom media system.

## Natural hero geometry at desktop and 400% text zoom

The editorial hero no longer stretches its image to the full shell width and then clips its height with `object-fit: cover`. That combination cropped ordinary 4:3 images at desktop widths when the 78vh cap applied. Slateframe now retains the intrinsic aspect ratio with auto dimensions, a 100% inline bound, centered alignment, a 78vh fallback and a 78dvh dynamic viewport cap. `object-fit: contain` is defensive; the theme does not crop the Core attachment or override its responsive `srcset`/alt/caption/priority attributes. This is presentation only, not an image transformation or a new media service.

The existing disposable real WordPress featured-image test now checks the theme hero's natural-to-rendered ratio, viewport containment, bounded height and computed fit across 320/375/390/412/768/1440/1920px, LTR/RTL and 100/200/400% root text sizing. It captures 390/1440px natural hero images and a 390px RTL 400% forced-colors image for manual review. Isolated Chromium geometry is useful for preflight, but the exact HEAD WordPress/Chromium Actions, screenshot inspection, PHP/WPCS/Theme Check and reproducible ZIP are mandatory before merging.
