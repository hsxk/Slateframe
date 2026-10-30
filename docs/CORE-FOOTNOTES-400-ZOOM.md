# Native Core Footnotes at 400% enlargement

Slateframe retains the WordPress Core dynamic `core/footnotes` block and its post metadata. This is presentation only: no custom storage, JS navigation, or business logic.

The former Footnotes-specific `1.35rem` list indent is 21.6px at a 16px root but grows to 86.4px at a 64px root because footnotes use 0.9rem. The conditional stylesheet preserves the original 16px baseline, bounds logical indentation at 32px, caps item spacing at 20px, and caps the item inset at 8px. Its specificity overrides the generic prose rule independent of CSS loading order.

Only direct-child Core-generated backlinks ending in `-link` receive 44–56px targets and visible focus. Other source links are untouched. The enlarged backlink hit area is screen-only, so print output keeps Core's compact inline return mark. Gutenberg loads the same CSS; the universal reading CSS sheds the old footnote rules.

Acceptance uses native superscript references with `data-fn` IDs and real WordPress `<!-- wp:footnotes /-->` plus JSON-encoded `footnotes` post metadata. Verify seven widths, LTR/RTL, 16/32/64px roots, CJK/Arabic, overflow, keyboard, Axe, forced-colors, editor validity, and CRC-validated 390x900/1440x900 WordPress screenshots. Isolated Chromium is only preflight.

The screenshot verifier also decompresses the complete Chromium PNG image stream and checks its expected RGB/RGBA row length, not only the signature, IHDR, CRC and IEND markers.
