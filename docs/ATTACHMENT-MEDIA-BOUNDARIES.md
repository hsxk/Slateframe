# Core attachment media adapter boundaries

Slateframe's `attachment.php` renders WordPress attachment pages without creating a media content model. The template uses Core's image API, native audio/video shortcodes, attachment metadata, and the public-parent recovery helper. No external media service, analytics, or business-specific adapter is involved.

## Runtime behavior

- `wp_get_attachment_url()` normally returns a string or `false`. A filtered array/object is ignored instead of being coerced to `Array` or triggering a type error. The string is passed through `esc_url_raw()` **before** it is used by a media shortcode or rendered as an original-file link. Unsupported URL protocols therefore produce no preview or original-file link.
- `get_post_mime_type()` and `wp_get_attachment_caption()` must yield strings to be displayed. Malformed filtered values are ignored, without PHP warnings or accidental metadata output.
- An image attachment only emits its wide figure and caption when `wp_get_attachment_image()` yields a nonempty string containing an actual image tag. A malformed/empty image response does not produce an empty figure or orphan caption. Core's responsive `srcset`, alternative text, eager loading, asynchronous decoding, and high fetch priority are retained.
- Valid `video/*` and `audio/*` attachments keep Core's native shortcode previews. Non-previewable files still offer the original-file link when its URL is safe.
- Public-parent visibility is decided separately by `slateframe_public_attachment_parent_id()`. Invalid media adapters cannot make a private parent visible.

## Acceptance and limits

`tests/fixtures/attachment-media-template.php.fixture` executes the **real** `attachment.php` with error-to-exception conversion, including valid image/CJK caption, responsive `srcset`, native video/audio, invalid image HTML, malformed MIME/caption/URL types, unsupported URL protocols, and public-parent fallback. `tests/test_attachment_media_template.py` runs the fixture and checks the Core-only template boundary.

The isolated PHP test is not a substitute for real WordPress + Chromium acceptance. Confirm both required GitHub Actions on the exact PR HEAD SHA; review mobile and desktop attachment screenshots in the Theme quality artifact; verify the main merge SHA separately. No production WordPress installation is involved.
