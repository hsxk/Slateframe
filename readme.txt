=== Slateframe ===
Contributors: hsxk
Requires at least: 6.7
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html
Tags: blog, photography, portfolio, translation-ready, rtl-language-support, block-styles

A fast, accessible, multilingual-ready WordPress theme for publishing, photography, blogs, portfolios, and personal websites.

Slateframe WordPress Theme, Copyright (C) 2026 hsxk.
Distributed under the terms of the GNU General Public License, version 3 or later.

== Description ==

Slateframe is a content-first hybrid WordPress theme built around WordPress core rather than a page-builder runtime.

Highlights include:

* Editorial post and Page reading layouts with a restrained readable measure.
* Wide and full-width block support.
* Responsive primary navigation, optional footer navigation, and a responsive Core block/widget footer region with shared accessible control sizing.
* Core Search, legacy Search, and authored HTML forms in published synced patterns receive the same conditional presentation styles in posts and footer widgets.
* Published synced patterns also receive conditional Photography/Core lightbox, Portfolio Query Loop, and Knowledge presentation in posts and Pages; unpublished and cyclic references do not cause unbounded asset discovery.
* Native comments and authored Core Comments threads with responsive multilingual author/date/reply targets, plus archives, author pages, search, pagination (including bounded Core Comments Pagination links), and 404 handling, with responsive native Core Categories and Archives list/dropdown presentation and native Tag Cloud and Post Terms controls, and native hierarchical Page List navigation, and Core Latest Comments with bounded multilingual comment links.
* Lightweight code, responsive native Core tables (fixed layouts, captions, stripes and forced-colors presentation), gallery, footnote, pullquote, disclosure, editorial lead, table-of-contents, and print presentation.
* Starter patterns for photo essays, photography contact sheets/features/diptychs/three-image sequences with local replaceable placeholders, project case studies/indexes/briefs/outcomes/query grids/native Query Loop chooser layouts/decision logs, learning paths/lesson chapters/knowledge outlines/definitions/checkpoints/procedures/comparisons/questions-and-answers/evidence trails/glossaries/native article Query Loop chooser layouts, editorial openings/notes/pathways/pullquotes, and curated reading lists.
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

== Design and accessibility verification ==

Slateframe uses native WordPress blocks and settings. Before publishing a site, review the following with actual content rather than relying on theme screenshots alone.

* In Appearance > Customize > Slateframe design, check compact, default, and spacious spacing at 320, 375, 390, 412, 768, 1440, and 1920 CSS pixels. Interactive controls should remain at least 44px high.
* Test header navigation, search, forms, comments, and footer with a keyboard. Focus must remain visible and the compact menu must be operable without a pointer.
* Check the site at 200% text enlargement and 400% browser zoom, including long navigation labels and long article titles.
* Check RTL and CJK content with real translated text, including mixed-direction links, captions, metadata, and long unbroken strings.
* Preview the same blocks in the editor and on the published page. Check wide/full alignment, tables, galleries, File blocks, Details blocks, and Query Loops.
* Test native Core lightbox with mouse, keyboard, and touch. Check image containment and return of focus after closing.
* Verify contrast and visible focus in light, dark, and operating-system color modes, including forced-colors and reduced-motion preferences.
* Confirm photographs have meaningful alternative text when informative, or empty alternative text when decorative. The theme cannot supply this editorial information.
* Verify that a newly installed theme ZIP contains only distributable theme files. Do not include development dependencies, credentials, or site-specific content.

These checks describe a review process, not a claim of WordPress.org accessibility-ready certification. Theme and content accessibility both matter.

== Release evidence and package review ==

For each candidate release, record the exact Git commit SHA and retain the corresponding successful Theme quality and Photography runtime Actions links. A successful earlier commit is not evidence for a later commit or for the squash-merged main commit.

* Review the full set of required Jobs, including static tests, WordPress/PHP compatibility, WPCS, Theme Check, browser smoke, and the distributable build. Investigate a failed Job from its actual logs before modifying code.
* Download the browser artifact for that same SHA and open real WordPress/Chromium screenshots, not just an artifact listing. Compare compact, default, and spacious Appearance settings at mobile and desktop widths.
* Inspect Photography and native Core lightbox, Portfolio Query Loop, Knowledge and article reading views, plus header, navigation, search, forms, comments, and footer. Include RTL, CJK, 200% text, 400% zoom, keyboard focus, and forced-colors cases.
* Inspect the distributable ZIP itself. Confirm its contents are limited to theme runtime assets and required licensing/documentation, with no symlinks, hidden credentials, test fixtures, CI workflows, dependency directories, or local site content.
* Compare the packaged file manifest and checksums across equivalent PR and push builds where available; a successful build alone does not establish byte-for-byte reproducibility.
* After merging a verified PR, separately check the merged main SHA and its required Actions before treating that main revision as release-ready. A merged PR is not itself a release certification.

Do not describe an unexecuted check, an unreviewed screenshot, or a queued workflow as passed. Keep a record of known visual limitations and the exact viewports reviewed.

== Frequently Asked Questions ==

= Does Slateframe require a page builder? =

No. Slateframe is designed around WordPress core templates, blocks, patterns, menus, and theme.json.

= Does Slateframe require a multilingual plugin? =

No. The theme is language-agnostic and works with normal WordPress locales. Multilingual plugins may integrate through public hooks without becoming core dependencies.

= Can I use the Photo sequence style without a Slateframe pattern? =

Yes. Apply Photo sequence to a native Core Gallery in the block Styles panel. The first image spans the two-column desktop grid; narrow screens use one column. Images keep their natural proportions, even with the Core crop option enabled. Core lightbox remains optional.

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
