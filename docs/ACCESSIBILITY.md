# Keyboard skip navigation and focus ownership

Slateframe uses one translated **Skip to content** link before the site header. Its fragment target is the page's single `<main id="main-content">` landmark. Each public PHP template now gives that landmark `tabindex="-1"`: it can receive programmatic fragment focus without entering the normal Tab sequence. This matters for keyboard and screen-reader visitors on long menus, at 200% text zoom, and on RTL/CJK sites.

## Contract

- The skip link is the first keyboard stop; pressing Enter moves focus to the main landmark, not merely the URL fragment.
- The next Tab proceeds into the content instead of returning to the site header.
- Keep exactly one `main-content` ID per rendered route, including archives, search, 404, and attachment pages.
- Do not use positive tabindex, click handlers, a focus trap, or a JavaScript scrolling shim.
- A visible focus indicator remains on interactive descendants. The landmark is not part of ordinary sequential Tab navigation.
- Navigation disclosure and Core Details remain native and separately keyboard-operable.

## Evidence

`tests/test_skip_link_destination.py` verifies all seven public template targets. `tests/browser/theme.spec.js` checks Enter focus and next-Tab ownership in Chromium at each supported viewport. Final release still requires real-browser keyboard, screen-reader, zoom, forced-colors and visual inspection; static markup checks alone do not establish accessibility compliance.

The browser CI runner uses two workers to execute independent viewport projects without dropping tests, reducing single-worker latency while preserving the same assertions, artifacts and WordPress fixture.

## Core Knowledge list semantics

The native Steps and Checklist block styles replace only visual markers. Their root Core List receives `role="list"` at render time when no author role is present, preserving WebKit/VoiceOver list announcements without changing Gutenberg storage or nested list semantics. The real WordPress `core-list-semantics.spec.js` suite covers exact class matching, author roles, seven responsive widths, RTL/CJK, 200% zoom, forced colors and Axe. Manual Safari/VoiceOver verification remains part of release readiness; see [Core List semantics](CORE-LIST-SEMANTICS.md).
