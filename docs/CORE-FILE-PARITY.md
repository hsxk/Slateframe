# Native Core File parity

Slateframe styles WordPress `core/file` rather than introducing a document manager,
custom download endpoint, analytics, previewer, or external service. Core owns the
file URL, filename, downloadable link, button label, optional PDF preview, and
Gutenberg serialization. This presentation-only asset is registered with
`wp_enqueue_block_style()` and shared with the editor.

The block's text and download links retain their authored URLs and `download`
semantics. The conditional stylesheet gives them bounded logical dimensions,
multilingual long-label wrapping, and a minimum control-height target based on
`--slateframe-control`. It adds no JavaScript, request, or theme-specific data.

Acceptance uses a disposable WordPress page linking to the theme-local public
readme, checks the file response and original download attribute, seven widths
(320, 375, 390, 412, 768, 1440, 1920), LTR/RTL, 200%/400% text, keyboard
focus, Axe, forced colors, screenshot evidence, 404 isolation, and authenticated
Gutenberg serialization. The fixture is removed in `finally`.

Release review: inspect exact-HEAD WordPress/Chromium screenshots and manually
check Core File download and preview behavior with Safari/VoiceOver and Firefox,
including author-controlled media URLs and PDF plugin coexistence.
