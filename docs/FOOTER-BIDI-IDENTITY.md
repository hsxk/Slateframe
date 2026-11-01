# Bidirectional site identity in the native footer

The footer reads the site name and tagline through WordPress Core's `bloginfo()`, and the copyright year through `wp_date()`. These strings can mix Arabic/Hebrew, CJK, Latin, numbers and punctuation. A surrounding RTL or LTR page must not reorder the year or cause a user-authored site name to change the reading direction of adjacent footer content.

## Presentation boundary

The template wraps each independent text run in a native HTML `<bdi>` element: the brand name, optional tagline, copyright-year group and repeated copyright name. `bdi` lets the browser determine the direction of each run and isolates it from its neighbors without hard-coding `dir="ltr"`, duplicating translated strings, changing the WordPress settings, or adding a bidi library. WordPress remains responsible for output escaping, localization and the date. Empty taglines still render no paragraph.

No custom JavaScript, CSS, API, plugin, schema, remote asset or paid feature is introduced. The footer menu remains Core `wp_nav_menu()` with its complete hierarchy, and the existing 44px link targets and Spatial/Appearance budgets remain unchanged.

## Acceptance

The isolated PHP test executes the actual `footer.php` with mixed Arabic/Japanese/Chinese identity strings, asserting all four isolation boundaries, correct copyright and retained Core hooks. A separate real WordPress/Chromium test renders the template with process-local `pre_option_blogname` / `pre_option_blogdescription` filters, then checks native `unicode-bidi: isolate`, seven widths (320–1920), LTR/RTL, 100%/400% text, document/footer overflow and WCAG Axe. It captures two mandatory exact-HEAD screenshots: `footer-bidi-390-rtl-400-forced-colors.png` and `footer-bidi-1440-ltr.png`.

The screenshot inventory gate now requires 100 distinct representative states rather than 98. A successful static test or uploaded screenshot list does not replace inspecting the real images, verifying all necessary Actions on the exact SHA, or checking the main merge SHA. Manual Safari/VoiceOver and Firefox bidi announcements remain a release-readiness follow-up.
