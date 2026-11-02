# Classic media metadata and caption readability

Slateframe uses WordPress Core attachment metadata, image generation, native video/audio
shortcodes and post featured images. The theme adds presentation only; it does not
replace media storage, queries, lightbox behavior, or Gutenberg Core blocks.

The `slateframe_attachment_details` filter may return metadata whose labels or values
are HTML-only, whitespace, Unicode combining marks or invisible filler characters.
Such rows now disappear rather than producing unnamed definitions. Readable CJK/RTL
labels, numerical zero, punctuation, native MIME/dimensions/filesize, and filter
values remain unchanged and are escaped at output. Attachment details use a native
`<dl>` with paired `<dt>`/`<dd>` terms and definitions, each with `<bdi>` to
isolate mixed CJK/RTL text. The compact label/value rows reflow vertically at
high zoom without horizontal overflow. Invalid non-array filter returns
continue through the same readability normalization on Core metadata, so an
unreadable native value cannot bypass the filtered-row checks.

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

## Native audio/video shortcode source integrity

Core audio and video shortcodes may render a `src` on the player or one or more
nested `<source src>` candidates. Slateframe checks the sanitized player for a
nonblank source before displaying a classic attachment figure and its caption.
When a shortcode filter produces an empty or source-less media shell, the theme
omits the nonfunctional preview while retaining the safe original-file link,
attachment content and metadata. The guard uses WordPress's HTML Tag Processor;
it adds no player library, JavaScript, remote request or custom media handling.
Executable PHP regressions cover both media types, blank sources and later
valid candidates.
The candidate scan stops at the matching player's closing tag; a `<source>`
following a closed `<video>` or `<audio>` is not part of that player and cannot
turn an empty preview into a misleading playable figure. Both the executable
PHP fixture and real WordPress browser fixture guard this boundary.

Core's default post KSES omits `<source>` even though its audio/video shortcodes
emit nested source candidates. Slateframe extends the sanitized media-shortcode
allowlist only for the `source` element (`src`, `type`, `media`), using Core
`wp_kses()` protocol validation. It does not allow arbitrary scripts, event
handlers or unsafe source protocols. Regression verifies source preservation,
unsafe source removal and absence of nonfunctional figures.
