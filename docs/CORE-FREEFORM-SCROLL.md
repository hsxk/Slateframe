# Core Freeform keyboard scrolling

WordPress Core's **Classic / Freeform** block preserves existing HTML without requiring a custom block. A wide native `<pre>` or `<table>` can scroll horizontally inside Slateframe's singular reading canvas at narrow widths or enlarged text. Those scroll containers must remain reachable with a keyboard, including in RTL documents.

Slateframe adds `tabindex="0"` to native `PRE` and `TABLE` tags when **Core Freeform** renders. It uses WordPress's `WP_HTML_Tag_Processor`, preserves an author-supplied tabindex (including `-1`), and excludes the wrapping `wp-block-verse` style. No JavaScript, replacement markup, content migration, or saved Gutenberg attributes are involved. The filter does **not** change arbitrary `core/html` blocks, global `the_content` output, or plugin HTML.

The existing reading stylesheet already supplies horizontal containment, logical responsive widths, and visible focus outlines for native preformatted text and direct-child tables. The theme does not turn a table into an ARIA grid or change table, caption, header, and cell semantics. When a Freeform table does not overflow, its explicit focus stop is retained for predictable keyboard navigation at other zoom levels.

## Automated acceptance

- `tests/test_core_freeform_scroll_contract.py` guards the narrow render hook, authored-focus preservation, Verse exclusion, and existing CSS; no new CSS/JS bytes.
- `tests/browser/core-freeform-scroll.spec.js` uses a disposable published WordPress Core Freeform page and tests seven viewport widths (320/375/390/412/768/1440/1920), LTR/RTL, CJK/Arabic text, 200%/400% text zoom, keyboard scrolling, and forced-colors focus. It checks that stored post content is unchanged and captures 390/1440 Chromium screenshots.
- This extends, rather than changes, the existing `core/html` table contract in `tests/browser/plain-table-keyboard.spec.js`.

## Manual release check

Before release, check Safari/VoiceOver and Firefox keyboard and screen-reader behavior with a long Classic-block source line and a wide captioned table. Verify the focus stop is understandable, arrow keys scroll only the focused region, focus is visibly outlined, and tabbing continues into subsequent content. Automated Chromium evidence is a regression baseline, not a WCAG certification.
