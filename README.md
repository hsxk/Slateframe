# Slateframe

**A clean frame for whatever you publish.**

[![Theme quality](https://github.com/hsxk/Slateframe/actions/workflows/quality.yml/badge.svg)](https://github.com/hsxk/Slateframe/actions/workflows/quality.yml)

Slateframe is a fast, accessible, multilingual-ready WordPress theme for publishing, photography, blogs, portfolios, and personal websites. It is built as a small hybrid theme around WordPress core rather than a page-builder runtime.

## Development status

Slateframe is under active pre-release development. `main` is kept installable; ongoing work lives on `automation/continuous-development` and is reviewed through a draft pull request before a release milestone.

The current development line installs and activates in a clean WordPress + MariaDB environment through public CI and produces a validated installable ZIP. It is not yet a release candidate.

## What is already implemented

- Native WordPress hybrid architecture with `theme.json`, the PHP template hierarchy, block styles, and theme patterns.
- Editorial post, page, archive, search, author, comment, pagination, and 404 presentation.
- Responsive navigation with keyboard support, focus handling, reduced-motion behavior, and a no-JavaScript fallback.
- Wide and full-width block content without forcing long-form prose beyond its readable measure.
- Starter patterns for photo essays, project case studies, and structured learning paths.
- Language-agnostic i18n foundations, logical CSS properties, RTL support, and a plugin-neutral language-switcher hook.
- System-font typography, lightweight native JavaScript, and explicit frontend asset budgets.
- Reproducible theme packaging plus real WordPress install/activation smoke tests in CI.
- Chromium regression coverage at 320, 375, 390, 412, 768, 1440, and 1920 pixels for navigation and focus containment, keyboard skip links, core routes, nested fallback pages, long mixed-script titles, comments on posts and pages, publishing primitives, overflow, wide/full blocks, reduced motion, and reference screenshots.

## Design principles

- **Content first.** Typography, spacing, alignment, rules, and imagery establish hierarchy before decorative UI.
- **WordPress first.** Core templates, blocks, patterns, and APIs are preferred over framework-shaped abstractions.
- **Language agnostic.** No fixed locale list, locale URL scheme, or required multilingual plugin is built into the theme.
- **Accessible by design.** Keyboard behavior, visible focus, semantic structure, reduced motion, and resilient fallbacks are product requirements.
- **Performance by architecture.** System fonts, small assets, contextual loading, and native browser behavior come before optimization plugins.
- **Portable content.** Theme presentation stays in the theme; business logic and content ownership stay outside it.

## Starter patterns

Slateframe currently ships three reusable patterns under the **Slateframe** pattern category:

- **Photo essay** — a wide editorial introduction followed by a native Gallery block for image-led stories.
- **Project case study** — role/scope context plus concise Context, Approach, and Outcome sections.
- **Learning path** — a three-stage Foundation → Practice → Extend structure for guides and educational content.
- **Editorial note** — a restrained contextual note or caveat that remains part of normal document flow.
- **Curated reading list** — a typography-led related-reading section without forcing content into cards.

Patterns contain no site-specific projects, courses, locale paths, or personal content. Replace the example copy with your own content after insertion.

## Multilingual, RTL, and CJK

Slateframe does not assume English-only content or a fixed set of supported languages. User-facing theme strings use the `slateframe` text domain, CSS favors logical properties, and layouts are designed to tolerate CJK, RTL, and longer translated strings.

Multilingual plugins are optional integrations rather than dependencies. A public `slateframe_language_switcher_html` filter is available for integrations that want to render a language switcher inside the theme navigation.

## Installation

For development builds:

1. Download or build `slateframe.zip`.
2. In WordPress, open **Appearance → Themes → Add New → Upload Theme**.
3. Upload the ZIP and activate Slateframe.
4. Assign Primary and Footer menus as needed.
5. Optionally configure a Custom Logo and build page content with core blocks and Slateframe patterns.

Slateframe does not currently require a page builder or companion plugin.

## Development

The long-lived development branch is `automation/continuous-development`.

Build the distributable package from the repository root:

```bash
./bin/build-theme-zip.sh
```

The result is written to `dist/slateframe.zip`. Public CI validates PHP/JavaScript/theme metadata, namespace and locale assumptions, frontend asset budgets, pattern metadata, a clean WordPress installation and activation, registered starter patterns, responsive Chromium browser smoke tests, and package contents.

Browser tests use Playwright and can be pointed at any local Slateframe WordPress instance:

```bash
npm install
PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8080 npm run test:browser
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Compatibility

Current development metadata targets:

- WordPress 6.7+
- PHP 7.4+
- `theme.json` version 3

Compatibility claims will be tightened and expanded through the pre-release test matrix rather than inferred from syntax alone.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
