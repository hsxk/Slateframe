# Appearance seven-breakpoint spatial and direction matrix

The compact/default/spacious profiles must remain functional beyond the two representative full-page review widths. This acceptance slice adds real WordPress + Chromium evidence at **320, 375, 390, 412, 768, 1440, 1920px** for each profile, with ordinary LTR and RTL/CJK/Arabic **200% text + forced-colors + reduced-motion** captures at every width.

The test verifies bounded 44/44/56px controls, keyboard focus and both target dimensions for native navigation and color controls, compact Enter/Escape disclosure behavior, root overflow, and visible header/title/footer geometry. It modifies only the browser fixture, not stored WordPress content. It adds no theme JavaScript, CSS, plugin integration, or business data.

The existing full-page Appearance suite continues to check Photography/Core lightbox, Portfolio, Knowledge, articles, forms, search and footer at 390/1440px. This matrix supplements rather than replaces those tests. CI requires all **42 additional screenshots** from the exact SHA (3 profiles × 7 widths × 2 states); reviewers must open the PNGs, not just read the inventory. Safari/VoiceOver and Firefox remain manual release checks.

## 400% text and forced-colors gate

At 390px, each Appearance profile additionally checks both LTR and RTL at a 64px root font (400% of 16px), while forced colors and reduced motion are active. The real browser asserts the header, multilingual brand title and footer remain within the viewport; the document must not overflow. The color control must retain its 44/44/56px minimum target and a visible keyboard focus outline at least 2px wide. CI requires six extra screenshots (three profiles × two directions), bringing the new matrix to **48 PNGs**. A failing 400% contract is a theme layout defect to investigate, not a reason to suppress overflow or relax a test.

The matrix changes only the ephemeral browser DOM and never edits a WordPress post, global site settings, or production content.
