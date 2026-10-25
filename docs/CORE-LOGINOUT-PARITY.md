# Native Core Login/out presentation

Slateframe leaves authentication, login/logout URLs, redirects, nonces,
password fields, cookies, form labels and block serialization to WordPress
Core. No theme login endpoint, custom auth, extra JavaScript, external provider,
tracking or plugin dependency is introduced.

The conditional 750-byte Core Login/out stylesheet is editor-shared. Native
links, labels, username/password inputs and submit buttons use logical bounds,
CJK/RTL wrapping and the shared 44px target. It preserves WordPress's
checkbox, nonce, form semantics and native focus behavior.

## WordPress/Chromium acceptance

A disposable page renders the Core link and optional login form. Browser tests
check the actual WordPress login URL/action and controls, seven responsive
widths (320–1920px), LTR/RTL, 200%/400% text, keyboard focus, Axe, forced
colors, screenshots and 404 asset isolation. A separate authenticated fixture
verifies the nonce-bearing logout URL without following it. All posts are
deleted in finally. No credentials are submitted by the form fixture.

Authenticated Gutenberg roundtrips both supported Core attributes using the
registered schema and does not mutate the existing post.

Safari/VoiceOver, Firefox, password managers, virtual keyboards and localized
form announcements still need manual release review. A visual PASS requires
opening the exact-SHA WordPress/Chromium screenshot artifacts.
