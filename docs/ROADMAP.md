# Roadmap

Slateframe is pre-release software. The roadmap describes direction, not a promise of dates.

## Before the first release candidate

- Manually review Core Post Author Biography with Safari/VoiceOver and Firefox, including profile-empty behavior and RTL/CJK text reflow, after exact-SHA Chromium evidence.

- Manually verify Core Read More localized announcements and new-tab behavior in Safari/VoiceOver and Firefox after exact-SHA Query Loop/Chromium evidence.

- Manually review native Core Previous/Next Post link announcements, adjacent-post ordering and focus in Safari/VoiceOver and Firefox after exact-SHA WordPress/Chromium evidence; preserve Core query ownership.

- Manually verify native Core Post Featured Image alt-text and linked-image announcements, aspect-ratio preservation, and focus in Safari/VoiceOver and Firefox after exact-SHA Chromium evidence.

- Manually review Core Post Title linked/unlinked heading announcements, RTL/CJK long titles and focus behavior in Safari/VoiceOver and Firefox after exact-SHA Chromium evidence.

- Manually verify Core Post Excerpt Read More announcements, locale-specific excerpt boundaries and screen-reader focus in Safari/VoiceOver and Firefox after exact-SHA Chromium evidence.

- Manually review Core Post Author Name localized names, new-tab link announcements and keyboard navigation in Safari/VoiceOver and Firefox after exact-SHA WordPress/Chromium acceptance.

- Manually review native Core Post Date localized time and linked/unlinked date announcements in Safari/VoiceOver and Firefox after exact-SHA WordPress/Chromium acceptance.

- Manually review native Core Login/out form and logout announcements, password-manager autofill and virtual keyboards in Safari/VoiceOver and Firefox after Chromium acceptance.

- Manually review native Core Post Terms taxonomy links and separator announcements in Safari/VoiceOver and Firefox after exact-SHA WordPress/Chromium acceptance.

- Manually review Core Latest Comments screen-reader author/title announcements, localized dates and avatar alternatives in Safari/VoiceOver and Firefox after real WordPress/Chromium acceptance.

- Manually review Core Page List hierarchy and deep nested Navigation announcements in Safari/VoiceOver and Firefox after WordPress/Chromium acceptance.

- Manually review native Core Tag Cloud tag/category modes, variable count-based font sizing and accessible names in Safari/VoiceOver and Firefox after WordPress/Chromium regression evidence.

- Manually review Core Archives native month list/dropdown navigation in Safari/VoiceOver and Firefox, including localized month labels and calendar variants after Chromium fixture verification.

- Manually verify Core Categories nested lists and dropdown keyboard/VoiceOver navigation in Safari and Firefox after WordPress/Chromium baseline; preserve Core taxonomy ownership.

- Manually review native Core Latest Posts grid/list with Safari/VoiceOver and Firefox after the disposable WordPress/Chromium baseline; keep Core query ownership and plugin-neutral behavior.
- Manually review native Core Embed provider playback, author-defined aspect ratios and iframe accessibility in Safari/VoiceOver and Firefox after the offline WordPress/Chromium baseline; no theme-owned providers.
- Continue refining Photography/Gallery visual language after shipping mixed-orientation fixtures, natural-ratio features, responsive diptychs, replaceable theme-local starter media, editorial sequences, and native WordPress Core immersive viewing; next focus is final visual polish, manual accessibility review, and release-grade screenshot selection.
- Continue expanding Portfolio and Knowledge composition coverage after adding portable project metrics, Query Loop grids, decision trails, evidence prompts, lesson verification, procedures, comparisons, definitions, checkpoints, and authenticated Gutenberg rendering checks; next focus is deeper realistic empty/long authoring states and plugin coexistence without introducing custom content ownership.
- Expand WordPress.org readiness from the current required-check baseline to final submission review.
- Extend browser fixtures beyond the current CJK/RTL/long-string/table/gallery/comment/content-mode and real Gutenberg coverage, especially plugin coexistence and more destructive authoring edge cases.
- Complete manual Safari/VoiceOver and Firefox review of Core Buttons long-label focus order and 400% text reflow; automated evidence is tracked in [Core Buttons reflow](CORE-BUTTON-GROUP-REFLOW.md).
- Continue manual WCAG 2.2 review beyond the automated Axe, focus, accessible-name, and touch-target regression baseline, including Safari/VoiceOver announcements for markerless Core List styles (see [Core List semantics](CORE-LIST-SEMANTICS.md)).
- Verify keyboard and screen-reader handling of native Core Code/Preformatted and Classic/Freeform horizontal scroll stops in Safari/VoiceOver and Firefox; automated Chromium evidence is tracked in [Core code scrolling](CORE-CODE-SCROLL.md) and [Core Freeform scrolling](CORE-FREEFORM-SCROLL.md).
- Finish visual regression baselines and a representative `screenshot.png`.
- Replace the pre-release fixture screenshot with the final polished WordPress.org showcase.
- Document tested plugin coexistence where evidence exists.

- Preserve native Query Loop project-link keyboard targets, media focus indication, RTL/CJK wrapping, 200% text zoom, and forced-colors evidence through responsive browser regressions. Manual WCAG review remains required.

## After the baseline is stable

- Optional multilingual adapter examples for common plugins, kept outside core dependency paths.
- Additional editorial patterns based on core blocks.
- Continue mobile Photography contact-sheet rhythm review with real mixed-orientation raster evidence at 320–412px.
- Performance regression tracking as fixtures become more representative.
- Release/versioning policy once a stable compatibility surface exists.

## Non-goals

Slateframe will not become a page builder, SEO suite, analytics product, caching layer, or site-specific application framework.
