# Core-first presentation boundary

Slateframe is a free, plugin-neutral Hybrid Theme. Its rendering rules apply to WordPress Core blocks, semantic HTML and Slateframe block styles, not a named third-party plugin.

## Native tables and keyboard access

- Core Table and Calendar retain their Core-only render filters. Their scroll wrappers remain keyboard-reachable without replacing authored tabindex values.
- Plain HTML tables retain native markup and use bounded horizontal overflow. Only naturally scrollable tables should receive an automatic browser focus stop.
- Third-party plugins own their output, tabindex and scroll behavior. Slateframe does not modify their markup through `the_content`.
- Test 320/375/390/412/768/1440/1920px, RTL/LTR, 200%/400% zoom, forced-colors, frontend and Gutenberg parity before release.

No runtime JavaScript, SEO, analytics, caching or production-site changes are included.
