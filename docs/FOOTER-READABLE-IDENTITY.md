# Readable footer identity when WordPress has no site title

WordPress Core permits an empty site title. The theme's footer previously emitted an empty brand heading and a copyright line with an empty owner. It now reuses `slateframe_has_readable_label()`, the same Unicode-aware check as the header, and displays a localized **Home** label when Core's display-filtered name is not readable. The copyright line retains the Core-localized year but omits an owner entirely when no readable name is configured; it does not imply that Home owns the content.

A Core description containing only HTML entities, separators, or invisible Unicode is omitted. Readable Arabic, CJK, emoji and Latin names remain rendered through `bloginfo()`, with the existing native `bdi` isolation. The footer's native WordPress widgets, menu hierarchy and `wp_footer()` remain unchanged. No CSS, JavaScript, plugin feature, personal content, or production deployment is involved.

The executable PHP fixture covers 12 cases, including malformed filtered values and HTML escaping. Real WordPress/Chromium tests exercise 320/375/390/412/768/1440/1920px, LTR/RTL, 100%/400%, Axe, forced colors and two mandatory screenshots. The exact HEAD's Actions and actual screenshots must be reviewed before merge. Real-device screen-reader and Safari/Firefox checks remain manual release-readiness work.
