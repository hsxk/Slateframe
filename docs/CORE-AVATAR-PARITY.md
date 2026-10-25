# Native Core Avatar parity

Slateframe uses the native `core/avatar` block, not a custom user profile or
avatar provider. WordPress Core owns author/comment context, alt text, URLs,
link targets, avatar sources, border controls and duotone. This theme only
bounds oversized images to their containers and keeps small linked avatars
keyboard/touch accessible through the shared `--slateframe-control` token.

The conditional block stylesheet is shared with Gutenberg; it introduces no
JavaScript, third-party requests or user data. WordPress may use the site's
configured avatar provider; the disposable browser fixture intercepts Core's
remote avatar image requests and serves the theme-local square placeholder,
without changing the shipped theme or a real site's provider.

Acceptance: a disposable post tests linked and unlinked native avatars,
Core author archive URLs, original alt text, seven viewport widths,
RTL/LTR, 200%/400% zoom, focus, Axe, forced colors, screenshot evidence,
404 asset isolation and authenticated Gutenberg serialization. The test
removes its post in `finally`.

Release review: inspect exact-SHA screenshots and manually test Safari,
VoiceOver and Firefox with local avatars and avatar-provider failures.
