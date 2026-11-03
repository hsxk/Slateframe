# Release candidate acceptance ledger

This document separates **automated evidence**, **human visual review**, and **manual release sign-off**. It is not a declaration that Slateframe is ready for WordPress.org submission. Keep the ledger site-neutral and do not copy personal content or production URLs into fixtures.

## Baseline inspected on 2026-11-03

- Source: PR #288 head `88f3fccb6e72973a115dcebee23e910c71e3ad55`.
- Theme quality: [run 41570911392](https://github.com/hsxk/Slateframe/actions/runs/41570911392), 10/10 jobs successful, including Browser smoke.
- Photography: [run 41570911422](https://github.com/hsxk/Slateframe/actions/runs/41570911422), raster images and native lightbox successful.
- Browser evidence: `slateframe-browser` artifact 13203635524, `BROWSER_SCREENSHOT_INVENTORY.json`, 1,377 PNG files. Photography evidence: `slateframe-photography-runtime` artifact 13200944205, 54 PNG files.
- Independently built `slateframe.zip` from Theme Check and Build distributable matched byte-for-byte, SHA-256 `1e7831a65b4dee89d8afaef24d3155875c47c3332ec16de98cdcd3171a92c120`; 135 archive entries and no symbolic links.
- Human-reviewed representative screenshots: `appearance-breakpoints-compact-390-ltr-400-forced-colors.png`, `appearance-breakpoints-default-1440-ltr.png`, `appearance-breakpoints-spacious-390-ltr-400-forced-colors.png`, `appearance-compact-viewport-1440-knowledge.png`, `appearance-compact-viewport-1440-portfolio.png`, `numeric-metadata-article-1440-ltr.png`, `appearance-compact-viewport-1440-empty-search.png`, `header-bidi-1440-ltr.png`, `cjk-gutenberg-title-viewport-1440-rtl-200-forced-colors.png`, `core-sequence-320.png`, `core-sequence-390.png`, `core-sequence-1440.png`, `lightbox-landscape-viewport-320.png`, `lightbox-landscape-viewport-1440.png`.
- This baseline applies **only** to the cited head. A new release candidate must repeat all checks at its own exact SHA, and its post-merge main SHA must pass its own required workflows.

## Release-blocking evidence matrix

| Area | Required evidence | Current disposition |
| --- | --- | --- |
| Metadata and package | Theme Check, WPCS, PHP compatibility, valid 1200×900 PNG, reproducible ZIP, no symlinks/private files | Automated baseline succeeded at PR #288 head; repeat for RC |
| Spatial/Appearance | compact/default/spacious, 44px controls, authored settings and editor parity at 320/375/390/412/768/1440/1920 | Chromium baseline; manual visual sign-off pending |
| Publishing | Post/Page/archives/search/404/comments, empty and long states, Gutenberg native patterns | Chromium baseline; realistic authoring review pending |
| Photography | Mixed orientation, natural ratio, captions, Gallery and Core lightbox; focus, escape, RTL, mobile safe areas | Chromium baseline; Safari/VoiceOver and Firefox pending |
| Portfolio and Knowledge | Query Loop pagination/no-results, long CJK/RTL, procedure/checklist, 400% editor and published reflow | Chromium baseline; cross-browser and manual assistive-tech review pending |
| Accessibility | Axe A/AA, keyboard, visible focus, 200%/400%, forced-colors, reduced-motion, touch targets | Automated baseline; manual WCAG 2.2 and screen-reader review pending |
| Performance | Base and contextual CSS/JS budgets, no unneeded global assets, no new framework | CI baseline; representative real-content performance review pending |
| Distribution | GPL, site-neutral branding, no Pro/license locks, correct namespace and text domain, WordPress.org readme/screenshot | Automated baseline; final showcase and submission review pending |

## Manual sign-off protocol

1. Install the **exact RC ZIP** on a disposable WordPress 6.7+ installation, with no companion plugin required. Record WordPress, PHP, browser and OS versions.
2. Use replaceable, rights-cleared landscape, portrait and square photographs; long Japanese, Chinese, Arabic and mixed-script content; empty archives and a paginated Portfolio Query Loop. Never use real user content.
3. At 320, 375, 390, 412, 768, 1440 and 1920 CSS pixels, inspect header/search/forms/footer, single article, Portfolio, Knowledge, and Photography. Repeat compact/default/spacious and light/dark/system where relevant. Record filename, viewport, zoom, and finding for every screenshot.
4. In Safari with VoiceOver and Firefox with keyboard/screen reader, test native Core heading anchors, navigation, buttons, Details, tables, comments, file download, Gallery and lightbox. Test Escape/focus return and RTL/CJK announcements. Record actual results; Chromium success is **not** equivalent to this manual pass.
5. Recheck the known 390px/400% Gutenberg Core editor-shell overflow separately from Slateframe content overflow; do not weaken the existing procedure/glyph assertions or silently claim the Core shell is fixed.
6. Review the final WordPress.org `screenshot.png` at full 1200×900 resolution and the packaged readme/license/attributions. Replace the fixture-style screenshot with a polished generic showcase before the first release candidate.
7. Rebuild twice from the same SHA and compare ZIP hashes. Verify no development files, symlinks, secrets, personal domains, private assets or paths are distributed. Check final required Actions on both PR HEAD and merged main SHA.
8. Record explicit sign-off with the exact SHA, reviewer, date, evidence artifact IDs, open defects and release decision. **No sign-off is implied by a successful workflow alone.**

## Open release concerns

- The current generic fixture visuals prove layout behavior but do not yet establish final editorial/photography art direction or real-world content density.
- Safari/VoiceOver and Firefox manual parity remains outstanding across numerous native Core blocks; see [Roadmap](ROADMAP.md).
- The 390px, 400% Gutenberg Core editor-shell overflow must be tracked separately from theme-owned content and documented accurately.
- The final WordPress.org showcase screenshot, representative plugin coexistence and final RC/versioning decision remain outstanding.

Do not convert these concerns into green checkmarks without exact-SHA evidence. Prefer closing a complete user-visible vertical slice over accumulating narrowly scoped compatibility PRs.
