# Changelog

All notable changes to Slateframe will be documented here.

## Unreleased

### Added

- Public Slateframe hybrid-theme baseline.
- WordPress-native template hierarchy and `theme.json` design system.
- Accessible responsive navigation with a no-JavaScript fallback and mobile focus containment.
- Reusable post-list presentation and expanded single-post/Page reading system.
- Language-agnostic multilingual extension boundary, logical-property architecture, and RTL baseline.
- Public CI for syntax, metadata, namespace/i18n guards, asset budgets, WPCS/PHPCS, production-package WordPress.org Theme Check, real WordPress runtime, Playwright browser regression, and package validation.
- Real WordPress + MariaDB installation and activation smoke tests.
- Reproducible distributable ZIP packaging with development-file exclusions and validated 1200×900 screenshot metadata.
- Keep repository-only README documentation out of the WordPress.org distributable, which uses readme.txt.
- Release metadata consistency validation across style.css, readme.txt, and package.json.
- WordPress 6.7/current compatibility smoke coverage on PHP 7.4 and PHP 8.3.
- Automated Axe WCAG A/AA checks on representative mobile and desktop routes.
- Browser regressions for visible keyboard focus, accessible form names, and 44 px mobile touch targets.
- Responsive Chromium coverage at 320, 375, 390, 412, 768, 1440, and 1920 px.
- Wide/full block layout while preserving readable normal prose width.
- Photo essay, photography contact sheet, project case study, portfolio index, learning path, knowledge outline, editorial note, and curated reading-list patterns.
- Editor-canvas parity for content width, title rhythm, captions, and wide/full alignment.
- Block styles for editorial notes, framed images, photo sequences, contact sheets, project/learning sections, data tables, native disclosures, numbered steps, checklists, key facts, and editorial ledgers.
- Long-form primitives for footnotes, pullquotes, captions, multi-page content, native tables, and TablePress-friendly overflow.
- Public architecture, extension-point, roadmap, contribution, and security documentation.

- Classic WordPress alignment, caption, sticky-post, and post-author compatibility styling.
- Threaded comment-reply script loading on singular discussions only.
- Contextual content-mode stylesheet so photography, portfolio, and knowledge presentation does not inflate base archive/navigation CSS.
- Photography feature, project brief, and lesson chapter patterns with matching block styles.
- Real browser fixtures for mixed-orientation photography, long portfolio references, and RTL/CJK knowledge content.
- Representative 390px and 1440px showcase screenshots for photography, portfolio, and knowledge pages.
- Editorial lead and table-of-contents reading treatments plus print-friendly long-form output.
- Photography diptych, project outcomes, knowledge definition, and editorial opening patterns with matching block styles.
- Browser fixtures and regressions for diptych imagery, project metrics, definitions, reading leads, table-of-contents structure, and print presentation.

### Changed

- Set the public theme author metadata to Hao Kexin and enforce it in release validation.

- Normalized the public development version to 0.1.0 across release metadata and tooling.

### Fixed

- Preserve readable gutters for text inside full-width Group blocks while leaving the full-width surface intact.
- Keep photography pattern copy constrained while feature, contact-sheet, photo-essay, and diptych media can use the wide canvas.

- Place contact-sheet captions below photographs instead of inheriting WordPress Core's gradient image overlay.

- Restrict content-mode asset loading to documents that actually use Slateframe photography, portfolio, or knowledge styles.

- Avoid invalid nested anchors when a WordPress Custom Logo is configured.
- Keep fresh-install navigation structurally consistent with assigned menus.
- Keep nested fallback page navigation usable.
- Keep comment form controls inside narrow mobile viewports.
- Render comments and reply forms on Pages when WordPress enables them.
- Treat the custom-logo image as decorative when the visible site name already labels the brand link.
- Repair the quality workflow after malformed package-validation fragments prevented jobs from starting.
- Restore valid theme bootstrap syntax after the WPCS migration exposed a malformed support-registration block.

### Accessibility

- Avoid empty author links when content has no resolvable WordPress author, preserving discernible-link semantics.

- Render the footer menu in an explicit navigation landmark only when assigned.
- Exercise skip-link keyboard navigation in the browser regression suite.
- Trap focus within the open mobile navigation and return focus to the toggle when closed.
- Exercise reduced-motion behavior and long mixed-script titles in browser regression.
