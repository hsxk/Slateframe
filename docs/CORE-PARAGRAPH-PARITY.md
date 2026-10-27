# Native Core Paragraph: readable content without block ownership

Slateframe keeps `core/paragraph` native. WordPress owns the paragraph tag, inline formatting, links, language, authored alignment, colors, drop caps, and Gutenberg serialization. The conditional `core-paragraph.css` presentation asset only protects intrinsic inline reflow in both the frontend and editor. It introduces no JavaScript, custom block, SEO output, remote dependency, or new content model.

## Acceptance

- Publish a disposable WordPress post with long Japanese, Chinese, Arabic, and unbroken URL text; verify that links remain reachable and text stays inside the viewport at 320, 375, 390, 412, 768, 1440 and 1920px, LTR and RTL.
- Preserve Core's semantic `p` elements, authored center alignment, native drop-cap class and anchor destinations. Do not override Core's color or font-size support.
- At extreme mobile text zoom, constrain only the native drop-cap first-letter size to the available viewport width. Retain Core's float, class, authored paragraph styles, and default-size drop-cap appearance; assert the actual pseudo-element size, not just paragraph boxes.
- Exercise 200% and 400% root text scaling, keyboard focus, WCAG Axe and forced-colors contrast without weakening tests.
- Capture 14 frontend screenshots plus a 390px RTL/200% forced-colors screenshot from a real WordPress/Chromium run.
- Test asset isolation on a blank Page, suppressing footer widgets only for the disposable test request. A 404 is not a valid isolation fixture when footer widgets contain native Paragraph blocks.
- In the authenticated Gutenberg editor, serialize → parse → serialize native Paragraph markup and assert text, inline link, and supported authored alignment survive without mutating the editor document.
- Enforce a 300-byte stylesheet budget, source presence, screenshot evidence, and inclusion in the deterministic distributable ZIP.

Inspect the actual screenshot artifact from the **exact PR HEAD** and require both Theme quality and Photography Actions success before merge. Manual Safari/VoiceOver and Firefox checks remain necessary before release.

## Native Drop Cap authoring

`theme.json` enables WordPress Core's own Paragraph Drop Cap authoring control. Previously the theme disabled the editor control even though it preserved and tested the native `has-drop-cap` output. No custom control, markup, JavaScript, or plugin is introduced. The frontend and editor share the same conditionally loaded `core-paragraph.css` asset.

At 390px/400% text scaling, test both LTR and RTL with a real authored Drop Cap, keep its first-letter bounded, and capture viewport screenshots focused on the paragraph. WordPress Core's `:not(:focus)` behavior is intentional for editable content; do not override the focused state to force a decorative float. Verify the native `dropCap: true` attribute survives Gutenberg serialize → parse → serialize without changing the open document. Assert the generated HTML matches `wp.blocks.getSaveContent('core/paragraph', attributes)` for the **installed Core version**, rather than assuming a class will appear on a synthetic block. In the WordPress runtime tested by Theme quality run #40437536191, the serialized comment retained `dropCap: true` while synthetic save markup lacked `has-drop-cap`; that mismatch is a Core serializer behavior, not evidence that Slateframe should inject a replacement class. Independently verify `has-drop-cap` on a real published Paragraph fixture and retain the first-letter size, overflow, and screenshot checks. A future regression in native frontend styling must still fail. These screenshots supplement, not replace, the existing 14-width/direction captures and forced-colors evidence.
