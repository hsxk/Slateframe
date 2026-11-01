# Classic media metadata and caption readability

Slateframe uses WordPress Core attachment metadata, image generation, native video/audio
shortcodes and post featured images. The theme adds presentation only; it does not
replace media storage, queries, lightbox behavior, or Gutenberg Core blocks.

The `slateframe_attachment_details` filter may return metadata whose labels or values
are HTML-only, whitespace, Unicode combining marks or invisible filler characters.
Such rows now disappear rather than producing unnamed definitions. Readable CJK/RTL
labels, numerical zero, punctuation, native MIME/dimensions/filesize, and filter
values remain unchanged and are escaped at output. Invalid non-array filter returns
continue to fall back to Core metadata.

An attachment's caption can also contain only an invisible entity or markup. Native
image/video/audio previews and the featured hero omit these empty `<figcaption>`
elements. Readable captions remain sanitized with Core `wp_kses_post()` and retain
Gutenberg presentation parity. No runtime CSS/JS, extra requests or dependencies.

## Acceptance

- Executable PHP metadata fixture tests native and filtered details, Unicode entities,
  CJK/RTL, punctuation, zero, malformed types, and unreadable labels/values.
- Existing executable attachment and featured-media fixtures remain mandatory and
  cover the real templates, valid players, sanitization and missing media sources.
- A disposable real WordPress/Chromium fixture imports an image, creates a temporary
  post and scoped mu-plugin, tests hidden/visible attachment and featured captions,
  validates seven widths (320–1920), LTR/RTL, 100%/400%, keyboard, axe, forced
  colors and screenshots, then deletes all temporary data in `finally`.
- Exact-HEAD Theme quality, Photography, visual artifact inspection and independent
  distribution ZIP byte identity are required before merge.
