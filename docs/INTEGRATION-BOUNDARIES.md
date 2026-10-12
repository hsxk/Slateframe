# Portable integration boundaries

Slateframe is a free, Core-first Hybrid Theme. Reusable presentation belongs in the theme; content ownership, storage, routing, analytics, search indexing, caching and editorial policy belong to WordPress or purpose-built plugins.

## Supported theme responsibilities

- Semantic PHP templates for standard WordPress archives, search, authors, posts, Pages, attachments, comments and missing-content states.
- Bounded Appearance controls, accessible navigation and forms, responsive media, typography, RTL/CJK support and Gutenberg parity.
- Portable block patterns and styles using ordinary Core blocks, including photography, portfolios, knowledge content and native Query Loops.
- Optional, documented filters for site-neutral language-switcher markup, author destinations, avatars, related content and presentation markers.

## Excluded site responsibilities

- Tracking, analytics events, SEO metadata/schema, redirects, sitemaps, search indexing, cache invalidation and CDN configuration.
- Fixed page IDs, translated routes, post-to-product maps, user mappings, credentials and site-owned media.
- Proprietary post types, workflow databases, membership or payment gates, external font runtimes and companion-plugin dependencies.
- Administration policy or removal of assets owned by other plugins.

## Acceptance

The distributable archive must contain only theme runtime and public assets. Public examples use generic content and local starter media, never copied production records. Integrations should use WordPress APIs and documented `slateframe_` filters without introducing locale assumptions or data migrations into theme core.
