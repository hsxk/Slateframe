# Native Core Page List parity

Slateframe preserves WordPress Core's published Page query, hierarchy, URLs, Navigation integration, and dynamic renderer. No custom content model, JavaScript, or site-specific data is added.

A conditional stylesheet, shared with Gutenberg via `add_editor_style()`, contains nested lists and supplies 44px logical link targets. Japanese, Chinese, Arabic, and unbroken page titles must reflow at 320/375/390/412/768/1440/1920px, LTR/RTL and 200%/400% text without horizontal overflow.

## Real WordPress acceptance

A disposable fixture creates a published parent/child/grandchild and an unpublished draft, renders `core/page-list` inside native Navigation, verifies exact links and hierarchy, and exercises keyboard focus, Axe, forced colors, screenshot evidence, navigation and 404 conditional-asset isolation. Every Page is deleted in `finally`. Authenticated Gutenberg verifies non-destructive block parse/serialize. The CSS budget is 500 bytes and the distribution manifest includes the new asset.

Manual Safari/VoiceOver and Firefox deep-hierarchy announcement review remains open. Visual approval requires downloading and actually inspecting exact-SHA WordPress/Chromium screenshots.
