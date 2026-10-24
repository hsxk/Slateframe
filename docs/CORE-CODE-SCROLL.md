# Native code and preformatted scrolling

WordPress Core **Code** and **Preformatted** blocks remain editable, portable Core content. At narrow widths, enlarged text, or when an author preserves source-line whitespace, their `<pre>` element may scroll horizontally. The theme's existing reading CSS keeps overflow inside that element and exposes a high-contrast `:focus-visible` outline, but the browser does not consistently put a non-interactive `<pre>` in the keyboard tab order.

Slateframe's `render_block_core/code` and `render_block_core/preformatted` presentation filters add `tabindex="0"` only to the **root** `<pre>` with the exact `wp-block-code` or `wp-block-preformatted` class. The filter leaves authored `tabindex` values, ordinary `<pre>`, Core Verse, nested elements, and lookalike class names untouched. No JavaScript, custom block, saved Gutenberg markup, plugin, or site content is changed. The code block retains its explicit left-to-right source-code presentation; Preformatted follows the document's direction.

## Acceptance and limits

`tests/browser/core-code-scroll.spec.js` checks real WordPress render filters, author overrides, exact class matching, and a published Core-block fixture at 320/375/390/412/768/1440/1920px in LTR and RTL. It exercises CJK/Arabic text, 200% and 400% text zoom, keyboard scrolling, forced-colors focus indication, and actual Chromium screenshots. `tests/test_core_code_scroll_contract.py` guards the hooks and existing CSS focus/overflow contract without increasing runtime CSS.

Automated Chromium checks do not establish Safari/VoiceOver or Firefox screen-reader announcements. Before release, manually verify that tabbing to an overflowing native Preformatted block announces a useful stop, arrow keys move its content, focus remains visible in high-contrast modes, and keyboard navigation resumes at the next page control. Keep native Code/Preformatted markup and editor behavior as the source of truth.
