=== Slateframe ===
Contributors: hsxk
Requires at least: 6.7
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html
Tags: blog, photography, portfolio, translation-ready, rtl-language-support, block-styles, accessibility-ready

A fast, accessible, multilingual-ready WordPress theme for publishing, photography, blogs, portfolios, and personal websites.

== Description ==

Slateframe is a content-first hybrid WordPress theme built around WordPress core rather than a page-builder runtime.

Highlights include:

* Editorial post and Page reading layouts with a restrained readable measure.
* Wide and full-width block support.
* Responsive primary navigation and optional footer navigation.
* Native comments, archives, author pages, search, pagination, and 404 handling.
* Lightweight code, table, gallery, caption, footnote, pullquote, disclosure, editorial lead, table-of-contents, and print presentation.
* Starter patterns for photo essays, photography contact sheets/features/diptychs/sequences, project case studies/indexes/briefs/outcomes/query grids/decision logs, learning paths/lesson chapters/knowledge outlines/definitions/checkpoints/procedures/comparisons, editorial openings/notes, and curated reading lists.
* Block styles for editorial notes/leads, framed images, photo sequences, contact sheets/diptychs, photography features, project features/briefs/metrics, learning paths/callouts/definitions, data tables, disclosures, numbered steps, checklists, key facts, and editorial ledgers.
* An editorial system-font type scale with Small, Body, Lead, Heading, and Display presets and no required third-party font request.
* A coherent spatial system for control sizing, component and reading rhythm, page gutters, reading/wide widths, section whitespace, and corner radius, with bounded controls in Appearance > Customize that are mirrored into the block-editor canvas.
* Adaptive light/dark presentation that can follow the operating system or use a site default, plus an accessible header toggle that remembers a visitor's explicit preference with a first-party functional cookie.
* WordPress i18n APIs, logical CSS properties, RTL support, CJK-safe wrapping, and long-string resilience.
* Optional multilingual integration through a public filter; no multilingual plugin is required.
* Contextual CSS architecture: long-form reading styles load only on singular documents, while Photography, Portfolio, and Knowledge styles are requested only when matching content is present, with a documented marker filter for integrations.
* Keyboard navigation, visible focus, threaded comment replies, reduced-motion support, semantic landmarks, and resilient no-JavaScript behavior.
* Classic WordPress alignment, caption, gallery-caption, sticky-post, and post-author compatibility classes.

Slateframe keeps presentation in the theme and leaves SEO ownership, analytics, caching, business data, and site-specific content models to WordPress core, plugins, or services.

== Installation ==

1. Upload the Slateframe theme ZIP in Appearance > Themes > Add New > Upload Theme.
2. Activate Slateframe.
3. Set the Site Title, Tagline, and optional Custom Logo.
4. Assign Primary and Footer menus if desired.
5. Use WordPress blocks and Slateframe patterns to build your pages and posts.

Slateframe does not require a page builder or companion plugin.

== Frequently Asked Questions ==

= Does Slateframe require a page builder? =

No. Slateframe is designed around WordPress core templates, blocks, patterns, menus, and theme.json.

= Does Slateframe require a multilingual plugin? =

No. The theme is language-agnostic and works with normal WordPress locales. Multilingual plugins may integrate through public hooks without becoming core dependencies.

= Does Slateframe support RTL and CJK content? =

The layout architecture uses logical properties and targeted RTL corrections. Long translated strings and CJK titles are included in the responsive browser regression suite.

= Does Slateframe add SEO schema, analytics, or caching? =

No. Slateframe focuses on presentation and semantic theme markup so dedicated plugins can own those responsibilities without duplicate output.

= Is Slateframe accessibility-ready? =

Accessibility is a core engineering target, including skip navigation, keyboard interaction, visible focus, reduced motion, semantic landmarks, and responsive touch targets. Formal WordPress.org accessibility-ready review is still part of the pre-release roadmap.

== Changelog ==

= 0.1.0 =
* Initial public development baseline.
* Added hybrid theme architecture, editorial templates, patterns, block styles, multilingual/RTL foundations, responsive navigation, CI, real WordPress smoke tests, Playwright regression, and reproducible packaging.
