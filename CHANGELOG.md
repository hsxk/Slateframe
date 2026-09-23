# Changelog

All notable changes to Slateframe will be documented here.

## Unreleased

### Added

- Public Slateframe hybrid-theme baseline.
- WordPress-native template hierarchy and `theme.json` design system.
- Accessible responsive navigation with a no-JavaScript fallback.
- Reusable post-list card template and improved single-post reading structure.
- Language-agnostic multilingual extension boundary and RTL baseline.
- Public CI for static validation, legacy namespace guards, locale-assumption guards, and asset budgets.
- Real WordPress + MariaDB installation and activation smoke tests.
- Reproducible distributable ZIP packaging.
- Responsive Chromium browser smoke tests for core routes, navigation, overflow, theme assets, and wide/full block layout.
- Wide and full-width block content while preserving a readable default prose measure.
- Photo essay, project case study, learning path, editorial note, and curated reading-list starter patterns.
- Editor-canvas parity stylesheet for content width, wide/full alignment, captions, and title rhythm.
- Data-table and editorial-disclosure block styles.
- Long-form publishing primitives for footnotes, pullquotes, captions, multi-page posts, and TablePress-friendly overflow.
- Keyboard focus containment for the open mobile navigation.

### Fixed

- Avoid invalid nested anchors when a WordPress Custom Logo is configured.
- Keep the fresh-install navigation fallback structurally consistent with assigned menus.
- Keep comment form controls inside narrow mobile viewports.
- Render comments and the reply form on Pages when WordPress enables them.
- Keep nested fallback page navigation usable on fresh installs.
- Treat the custom-logo image as decorative when the visible site name already labels the brand link.

### Accessibility

- Render the footer menu inside an explicit navigation landmark and omit the landmark when no footer menu is assigned.
- Exercise skip-link keyboard navigation in the browser regression suite.
