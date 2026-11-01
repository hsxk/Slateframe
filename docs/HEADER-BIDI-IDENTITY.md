# Mixed-direction identity in the Core header

The site name and optional tagline come from WordPress Core settings. They can contain Arabic, Hebrew, CJK, Latin text, digits and punctuation. The header's link and navigation must not reorder those text runs when the document direction changes.

The theme uses native HTML <bdi> around each independent identity run inside the existing title and tagline spans. No explicit LTR direction, new CSS, JavaScript, customizer setting, schema, plugin or paid feature is added. The existing WordPress Core bloginfo(), wp_nav_menu(), language switcher, skip link, color control, menu toggle and CJK letter-spacing behavior remain authoritative. Empty taglines remain absent.

The PHP regression executes the actual header.php, including a missing-tagline case. The real WordPress/Chromium test renders the Core header using process-local option filters, preserves the live navigation handlers, verifies two computed unicode-bidi: isolate runs, and checks seven viewport widths, LTR/RTL, 100%/400%, focus, horizontal containment and Axe WCAG. Two exact-HEAD screenshots are mandatory: header-bidi-390-rtl-400-forced-colors.png and header-bidi-1440-ltr.png. Visual evidence inventory increases from 100 to 102 states without weakening existing checks.

This is a presentation-only fix. Safari/VoiceOver and Firefox announcements remain manual release-readiness checks. Browser screenshots must be downloaded and actually inspected before merge.
