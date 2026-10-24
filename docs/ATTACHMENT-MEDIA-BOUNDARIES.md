# Core attachment media adapter boundaries

Slateframe's `attachment.php` renders WordPress attachment pages without creating a media content model. The template uses Core's image API, native audio/video shortcodes, attachment metadata, and the public-parent recovery helper. No external media service, analytics, or business-specific adapter is involved.

## Runtime behavior

- `wp_get_attachment_url()` normally returns a string or `false`. A filtered array/object is ignored instead of being coerced to `Array` or triggering a type error. The string is passed through `esc_url_raw()` **before** it is used by a media shortcode or rendered as an original-file link. Unsupported URL protocols therefore produce no preview or original-file link.
- `get_post_mime_type()` and `wp_get_attachment_caption()` must yield strings to be displayed. Malformed filtered values are ignored, without PHP warnings or accidental metadata output.
- Filtered image HTML is sanitized through Core `wp_kses_post()` **before** `WP_HTML_Tag_Processor` restores fixed `loading=eager`, `decoding=async`, and `fetchpriority=high` attributes. Sanitization strips scripts/event handlers while preserving responsive `srcset`, CJK alt, and sanitized captions; a final KSES pass would incorrectly remove Core priority hints.
- An image attachment only emits its wide figure and caption when `wp_get_attachment_image()` yields a nonempty string containing an actual image tag **with a nonblank `src` or `srcset`** after Core KSES. Source-less filtered tags do not create empty figures or orphan captions; the safe original-file link remains available. Valid `srcset`-only responsive images are preserved, alongside Core alternative text, eager loading, asynchronous decoding, and high fetch priority.
- Valid `video/*` and `audio/*` attachments keep Core's native shortcode previews inside semantic figures, with sanitized CJK/RTL captions when present. Non-string, empty, KSES-stripped, or non-media shortcode output cannot create an empty figure or orphan caption: Core's HTML tag processor must find a real `<video>` or `<audio>` tag after sanitization. Non-previewable files still offer the original-file link when its URL is safe.
- Core's video shortcode uses a fixed-width `.wp-video` wrapper and may gain a `.mejs-container` player. Slateframe bounds both wrappers to the reading column without rewriting Core markup or adding JavaScript; Gutenberg receives the matching containment rule. A real WordPress attachment browser matrix covers 320–1920px, RTL/CJK, 200% zoom and forced colors.
- Public-parent visibility is decided separately by `slateframe_public_attachment_parent_id()`. Invalid media adapters cannot make a private parent visible.

## Acceptance and limits

`tests/fixtures/attachment-media-template.php.fixture` executes the **real** `attachment.php` with error-to-exception conversion, including valid image/CJK caption, responsive `srcset`, source-less/blank-source image suppression, valid `srcset`-only images, native video/audio, invalid image HTML, malformed MIME/caption/URL types, unsafe filtered image markup, non-string, empty and sanitized-empty video/audio shortcode results, captioned native media, malicious shortcode markup, malformed article content, unsupported URL protocols, and public-parent fallback. `tests/test_attachment_media_template.py` runs the fixture and checks the Core-only template boundary.

The isolated PHP test is not a substitute for real WordPress + Chromium acceptance. Confirm both required GitHub Actions on the exact PR HEAD SHA; review mobile and desktop attachment screenshots in the Theme quality artifact; verify the main merge SHA separately. No production WordPress installation is involved.
