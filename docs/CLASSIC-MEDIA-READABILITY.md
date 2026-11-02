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

## Unicode-invisible native player URLs

A shortcode filter can leave a media `src` or nested `<source src>` containing
only invisible Unicode characters (including encoded zero-width characters,
Hangul filler, Braille blank or combining marks). Nonblank string length is not
proof of a playable URL. The classic media guard reuses Slateframe's existing
readable-text contract on the decoded attribute before displaying a player or
caption. It still accepts valid CJK/RTL URLs, relative paths, numeric paths and
later usable `<source>` candidates, and never scans beyond the current player.
An isolated executable PHP fixture covers 18 direct/nested/boundary cases; the
real WordPress/Chromium fixture exercises Core's HTML Tag Processor entity
decoding. No media library, extra request, CSS or JavaScript is added.


## Invisible image URLs and responsive candidates

Core featured and attachment images may be filtered into a broken `src` or
`srcset` containing only invisible Unicode. Slateframe checks the actual URL
token of each responsive candidate rather than treating its readable `2x` or
`1200w` descriptor as a usable image. It suppresses broken classic figures and
orphan captions while retaining the original-file recovery link. Normal CJK/RTL
paths, later valid responsive candidates, and srcset-only Core images remain
supported. An executable 18-case PHP fixture and real WordPress browser checks
cover the source contract without adding runtime CSS or JavaScript. The 390px RTL,
400% text, forced-colors invisible-image screenshot is mandatory exact-HEAD
browser evidence; its directory is created by the isolated fixture itself.

## Filtered recovery links, alt text, and percent-encoded URL tokens

Core attachment URLs may be filtered to a Unicode-invisible or percent-encoded
invisible value. Slateframe checks the decoded URL before and after Core
`esc_url_raw()` sanitization, omitting the unusable original-file link while
preserving valid relative, CJK, RTL and encoded media URLs. The same readable
URL-token guard applies to direct and responsive image sources and native
Core audio/video candidates; a percent-encoded invisible URL is not a playable
source. Filtered image alt containing only invisible characters becomes the
native empty decorative alt, while readable alt text is preserved. The source
markup, Core image generation and lightbox remain untouched.

Three isolated executable PHP fixtures cover 54 cases. The real WordPress
browser fixture checks recovery-link omission, both classic image alt surfaces,
percent-encoded sources, RTL 400% reflow, axe and mandatory forced-colors
screenshot evidence. No new CSS, JavaScript, dependencies or external requests.

## Missing filtered image alt attributes

WordPress Core normally emits an explicit `alt` attribute. Third-party
`wp_get_attachment_image` filters can remove it entirely, which may cause
assistive technology to announce an image filename. For the two classic
Slateframe-owned image surfaces (featured hero and attachment preview), the
shared HTML Tag Processor guard now restores `alt=""` when the attribute is
missing, invalid, or Unicode-invisible. Readable CJK, RTL, numeric, and
ordinary descriptive alt text remains unchanged. Core image markup, responsive
sources, Gallery/Lightbox, and editor-owned blocks are not rewritten.
Executable PHP cases and a disposable real WordPress/Chromium fixture assert
both image surfaces and axe behavior. No new CSS, JS, or dependencies.

## Web-only original-file recovery links

WordPress's default URL protocol allowlist includes schemes such as mail and FTP.
An attachment URL filter can therefore return a syntactically sanitized value
that cannot act as a normal browser media recovery link. Slateframe now passes
only HTTP and HTTPS to Core `esc_url_raw()` for the classic attachment's
"Open original file" action. Site-relative, protocol-relative, encoded CJK/RTL,
query-string, and ordinary HTTP(S) URLs remain available. This restriction
applies only to the recovery action, not Core media rendering, attachment
storage, native Gallery/Lightbox, or editor blocks. The isolated PHP fixture
covers 30 URL cases, while real WordPress/Chromium tests check mailto, FTP,
telephone, 390px RTL 400% forced-colors, overflow and a mandatory screenshot.
No CSS, JavaScript, dependency or external request is introduced.

## Recovery URL validation after Core filters

WordPress sanitizes the URL protocol before applying the public `clean_url`
filter. An integration can subsequently rewrite an HTTP(S) recovery link to a
mailto/data handler or a hostless URL. Slateframe rechecks the final Core
sanitized result with `wp_parse_url()`, accepts site-relative and valid
HTTP(S) URLs, and suppresses unsupported or malformed absolute destinations.
This affects only the classic original-file action; Core media storage,
rendering, Gallery/Lightbox and editor blocks remain unchanged. Executable
PHP cases and real WordPress WP-CLI assertions cover valid and invalid
post-filter rewrites without new CSS, JavaScript or dependencies.

## Browser-fetchable source boundary

Classic Core image, audio and video previews now reject non-web schemes such as `mailto:`, FTP, `tel:`, and `data:` even when KSES retains a readable source attribute. Site-relative, protocol-relative, CJK/RTL and HTTP(S) sources remain usable. `srcset` candidates are tokenized without interpreting the comma within a data URL as a separate relative image. This prevents a broken attachment image from remaining visible after a filtered original-file URL has been suppressed. The real WordPress/Chromium `media-non-http-file-url-390-rtl-400-forced-colors.png` screenshot and its no-figure assertion must be checked on the exact new HEAD; the prior screenshot visibly exposed a broken image icon.

## Fragment-only browser media URLs

A fragment-only URL (`#photo`) resolves to the current HTML document, not to a
media file. Filtered Core image `src`/`srcset`, audio/video sources, and classic
attachment recovery links now reject these false positives. The shared guard
still accepts legitimate file paths with fragments, query-based relative media
endpoints, CJK/RTL filenames and protocol-relative CDNs. Recovery URLs are
rechecked after Core's `clean_url` filter, including fragment rewrites. Isolated
PHP fixtures, real WordPress/Chromium media assertions and a required 390px RTL
400% forced-colors screenshot cover the behavior without adding CSS or JS.

## Classic listing-card thumbnail filters

A WordPress post can retain its featured-image ID even when a plugin filters
`post_thumbnail_html` to empty, non-image, or unplayable markup. Previously,
classic index, search, archive and author cards still rendered a decorative
anchor with no image. The shared Core-first card helper now obtains the
filtered `get_the_post_thumbnail()` markup once, sanitizes it with
`wp_kses_post()`, and uses the same HTML Tag Processor, usable web URL
and explicit decorative-alt guards as classic featured and attachment images.
The media link is emitted only when a valid image remains. The card's text
title, date, excerpt, native post link, lazy loading, responsive candidates
and CJK/RTL text remain intact. Core Query Loop and Gallery blocks are not
rewritten; no CSS, JavaScript or dependency is added.

Executable PHP tests cover malformed adapter returns, empty, fragment-only,
non-web, invisible and srcset-only sources, missing alt, multilingual alt and
unsafe handlers. A disposable WordPress/Chromium search-card fixture checks
seven widths, LTR/RTL, 100%/400% text, forced colors, axe, and a mandatory
390px RTL 400% screenshot. Exact-HEAD Actions, visual inspection and
byte-identical ZIP builds remain required before merge.

## Interactive markup in filtered card thumbnails

A third-party `post_thumbnail_html` filter can wrap an otherwise valid Core
image in another link or append a form control. Because the classic card already
owns its decorative permalink, that filtered markup would create nested anchors
or focusable controls inside an `aria-hidden` link. After Core post KSES,
Slateframe's HTML Tag Processor rejects interactive tags before emitting the
media link, including Core audio/video controls, image maps, and focusable
`tabindex` or editable wrappers. Explicit `tabindex="-1"` and
`contenteditable="false"` remain noninteractive. The guard retains the independent readable post-title permalink.
Ordinary noninteractive wrappers, Core `picture`/responsive sources, valid
CJK/RTL alt, lazy loading and async decoding remain supported. This changes no
editor-owned blocks, media storage, CSS or JavaScript.

The executable PHP fixture covers links before and after the image, form
controls, details/summary and valid noninteractive wrappers. Disposable real
WordPress/Chromium tests assert both filtered link variants, seven responsive
widths, LTR/RTL, 100%/400% text, axe and forced colors. The new 390px RTL
400% screenshot is mandatory evidence. Only exact-HEAD successful Actions,
manual screenshots and byte-identical distribution builds permit merging.

## Interactive ARIA roles in filtered thumbnail wrappers

A filtered thumbnail may use a non-native wrapper such as `<span role="button">`
without a focusable `tabindex`. Nesting that interactive accessibility role
inside a decorative permalink creates conflicting semantics. The card helper
rejects interactive ARIA roles after Core KSES, preserving inert `role="img"`
and `role="presentation"` wrappers, responsive images and CJK/RTL alt.
The independent post-title link remains available. PHP and real WordPress
390px RTL 400% forced-colors axe/screenshot evidence are mandatory.
No CSS/JS, dependencies or editor-owned markup changes.

## Composite ARIA widget roles in filtered thumbnails

Filtered image wrappers may declare composite widget roles such as `grid`, `menu`,
`tablist`, `tree`, `treegrid`, `radiogroup` or `toolbar` without any native
focusable element. These semantics still conflict with the theme-owned decorative
permalink. The shared card helper rejects these roles and `gridcell`/`menubar`
wrappers after Core KSES; case/outer whitespace variations are normalized.
Ordinary `group`, `none`, `img` and `presentation` wrappers remain supported.
The readable post-title permalink is always retained. Executable PHP regressions,
real WordPress search-card assertions, axe and mandatory 390px RTL 400%
forced-colors screenshots cover the boundary. No editor-owned block markup,
CSS, JavaScript or plugin responsibilities change.
