# Changelog

All notable changes to Slateframe will be documented here.

## Unreleased

### Added

- Public Slateframe hybrid-theme baseline.
- WordPress-native template hierarchy and `theme.json` design system.
- Accessible responsive navigation with a no-JavaScript fallback and mobile focus containment.
- Reusable post-list presentation and expanded single-post/Page reading system.
- Language-agnostic multilingual extension boundary, logical-property architecture, and RTL baseline.
- Public CI for syntax, metadata, namespace/i18n guards, asset budgets, WPCS/PHPCS, WordPress.org Theme Check, real WordPress runtime, Playwright browser regression, and package validation.
- Real WordPress + MariaDB installation and activation smoke tests.
- Reproducible distributable ZIP packaging with development-file exclusions.
- Responsive Chromium coverage at 320, 375, 390, 412, 768, 1440, and 1920 px.
- Wide/full block layout while preserving readable normal prose width.
- Photo essay, photography contact sheet, project case study, portfolio index, learning path, knowledge outline, editorial note, and curated reading-list patterns.
- Editor-canvas parity for content width, title rhythm, captions, and wide/full alignment.
- Block styles for editorial notes, framed images, photo sequences, contact sheets, project/learning sections, data tables, native disclosures, numbered steps, checklists, key facts, and editorial ledgers.
- Long-form primitives for footnotes, pullquotes, captions, multi-page content, native tables, and TablePress-friendly overflow.
- Public architecture, extension-point, roadmap, contribution, and security documentation.

### Fixed

- Avoid invalid nested anchors when a WordPress Custom Logo is configured.
- Keep fresh-install navigation structurally consistent with assigned menus.
- Keep nested fallback page navigation usable.
- Keep comment form controls inside narrow mobile viewports.
- Render comments and reply forms on Pages when WordPress enables them.
- Treat the custom-logo image as decorative when the visible site name already labels the brand link.
- Repair the quality workflow after malformed package-validation fragments prevented jobs from starting.
- Restore valid theme bootstrap syntax after the WPCS migration exposed a malformed support-registration block.

### Accessibility

- Render the footer menu in an explicit navigation landmark only when assigned.
- Exercise skip-link keyboard navigation in the browser regression suite.
- Trap focus within the open mobile navigation and return focus to the toggle when closed.
- Exercise reduced-motion behavior and long mixed-script titles in browser regression.
