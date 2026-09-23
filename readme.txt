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
* Lightweight code, table, gallery, caption, footnote, pullquote, and disclosure presentation.
* Starter patterns for photo essays, photography contact sheets, project case studies, portfolio indexes, learning paths, knowledge outlines, editorial notes, and curated reading lists.
* Block styles for editorial notes, framed images, photo sequences, contact sheets, project features, learning paths, data tables, disclosures, numbered steps, checklists, key facts, and editorial ledgers.
* System-font typography with no required third-party font request.
* WordPress i18n APIs, logical CSS properties, RTL support, CJK-safe wrapping, and long-string resilience.
* Optional multilingual integration through a public filter; no multilingual plugin is required.
* Keyboard navigation, visible focus, reduced-motion support, semantic landmarks, and resilient no-JavaScript behavior.

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
