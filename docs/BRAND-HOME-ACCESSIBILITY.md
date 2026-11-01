# Blank WordPress site identity: accessible Home target

WordPress Core permits an empty site title. A decorative custom logo has an empty
alt attribute by design, and the tagline is visually hidden on mobile. Without
a text fallback, the header's home link could have no accessible name. The
header now shows a localized, visible **Home** label when the Core site title
is unreadable and no custom logo exists. With a logo, the label is
screen-reader-only so the image is not visually duplicated. A normal title
(including CJK and Arabic) remains the native accessible name. The
existing optional tagline, Core site settings, native menu, skip link and
color controls remain unchanged.

The header's link also receives the shared `--slateframe-control` minimum block
size (44–56px). A cascade-equivalent nesting of the existing color-icon rules
keeps strict CSS budgets without altering light/dark presentation. No JS,
plugin dependency, paid feature or user content is added.

The executable PHP fixture covers sixteen title/tagline/logo combinations. The real
WordPress/Chromium test renders `header.php` with process-local Core option
filters and verifies seven viewport widths, LTR/RTL, 100%/400%, the accessible
name, 44px target, keyboard focus, horizontal containment, Axe and two required
exact-HEAD screenshots. Real-device VoiceOver/TalkBack and Safari/Firefox
remain manual release-readiness checks. Inspect the exact-HEAD screenshots
before merging.

A stale or non-image custom-logo attachment ID must not hide the visible Home fallback. The header now checks Core image attachment validity only when the title is unreadable and a logo setting exists. It also uses the same display-filtered Core name as `bloginfo()` and suppresses entity-only or Unicode-invisible taglines. The PHP fixture includes 19 cases, including stale logos; the exact new HEAD still requires full Actions and visual acceptance.
