# Core Details — native disclosure, keyboard and responsive reading

Slateframe keeps the WordPress Core `details` and `summary` elements, native list marker, keyboard toggling, and saved open/closed state. No extra JavaScript, custom ARIA toggle, plugin, or proprietary block is introduced.

- Summary targets use bounded Appearance `--slateframe-control` (44/48/56px), allowing multiline content to grow.
- Long Japanese, Chinese, Arabic, and unbroken words wrap at 320/375/390/412/768/1440/1920px.
- Logical inline sizing and browser-native marker placement retain RTL support.
- The border and expanded gap use shared Slateframe design tokens.
- The first paragraph after an expanded summary does not receive a doubled top gap.
- The reading stylesheet is shared with Gutenberg editor, rather than duplicating editor overrides.
- Forced-colors, 200% text zoom, print state, and Enter/Space are covered in real WordPress Playwright.
- A 390px RTL screenshot is captured; it must be downloaded and visually reviewed from the exact PR HEAD before merge.
