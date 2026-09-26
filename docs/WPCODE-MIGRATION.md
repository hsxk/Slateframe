# WPCode migration boundary

Slateframe was audited against the current Time2Log WPCode inventory as a migration reference. The production site remains read-only for theme development: snippets are not copied verbatim and no site IDs, locale routes, analytics identifiers, author IDs, product URLs, or private media enter Slateframe.

## Theme capabilities generalized

- Author bylines support a public `slateframe_author_url` adapter instead of a fixed author-ID → About-page map.
- Author archives expose opt-in `slateframe_author_avatar_html` profile media without introducing a default Gravatar/third-party request.
- Single posts provide a native, filterable related-reading surface with tag/category/recent fallback.
- Related queries leave normal WordPress filters enabled so multilingual plugins can constrain results without a hard dependency.
- Single-entry category and tag markup has public filters instead of Astra-specific taxonomy hooks.
- The native 404 template provides search, a home recovery action, and recent content.
- 404 discovery is filterable without fixed translated page IDs or locale URL assumptions.
- Core tables are keyboard reachable and stay inside the reading measure.
- TablePress-style wrappers are visually contained without the theme taking ownership of the plugin's enqueue policy.
- Native previous/next post navigation remains available and accessible; sites can disable or replace it at the template/integration layer instead of carrying an Astra-specific switch.
- Core navigation, language slots, search, pagination, comments, and 404 recovery share Slateframe's control/touch/focus system.
- TOC and knowledge presentation remain presentation concerns; SEO/schema generation stays with the owning plugin.
- Content-discovery surfaces use locale-aware WordPress dates and translatable Slateframe UI strings.

## Intentionally not migrated into theme runtime

These responsibilities remain site/plugin/service concerns:

- GTM/GA/dataLayer and analytics event instrumentation.
- Yoast metadata, Open Graph locale, schema graph, breadcrumb-schema ownership, sitemap exclusions, and noindex rules.
- Legacy URL redirects.
- Site-specific internal-link maps and fixed page/category/tag IDs.
- Time2Analyze product routing, product CTAs, course/category relationships, and hard-coded external product URLs.
- Polylang REST linking or translation relationship storage.
- Site-specific logo/media migration and fixed local-avatar files.
- Plugin asset deregistration such as conditionally disabling TablePress CSS/JS; Slateframe styles coexist with the plugin rather than overriding its loading policy.
- Astra-specific filters and markup rewriting.

This boundary keeps Slateframe portable while still covering the reusable presentation and content-discovery needs that previously required site snippets.
