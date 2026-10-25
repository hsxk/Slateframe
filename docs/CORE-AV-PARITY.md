# Native Core Video and Audio reflow

Slateframe keeps playback, tracks, subtitles, media URLs and accessible media
controls under WordPress Core and the browser. It does not ship a player,
transcoder, third-party embed, script, or custom media content type.

The small `core/video` and `core/audio` block stylesheets load only when the
respective block is rendered. They bound native media and their figure/caption
containers using logical inline sizes and allow long mixed CJK/RTL captions
to wrap without taking over user-authored dimensions. Both stylesheets are
also registered with Gutenberg through `add_editor_style()`.

The isolated WordPress/Chromium regression publishes native serialized Core
blocks (not an injected DOM-only mock), then checks both blocks at
320/375/390/412/768/1440/1920px in LTR and RTL. It checks that media and
captions stay inside their own figures, keyboard focus has a visible outline,
200% text and forced colors do not create horizontal overflow, and Axe reports
no WCAG A/AA violations in the fixture. Screenshots include 320/390/1440 LTR
and 390 RTL with 200% text/forced colors.

The source-free fixture intentionally verifies **presentation**, not media
decoding, streaming, native browser control usability, subtitles, or third-party
providers. Manual cross-browser and assistive-technology review is still
required. A green local test is not release acceptance: use both exact-HEAD
GitHub Actions workflows and inspect genuine WordPress/Chromium artifacts.
