# Slateframe

**A clean frame for whatever you publish.**

[![Theme quality](https://github.com/hsxk/Slateframe/actions/workflows/quality.yml/badge.svg)](https://github.com/hsxk/Slateframe/actions/workflows/quality.yml)
![WordPress 6.7+](https://img.shields.io/badge/WordPress-6.7%2B-21759b)
![PHP 7.4+](https://img.shields.io/badge/PHP-7.4%2B-777bb4)
![License GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)

Slateframe is a fast, accessible, multilingual-ready WordPress theme for publishing, photography, blogs, portfolios, and personal websites. It is intentionally built around WordPress core: a hybrid `theme.json` + PHP template architecture, native blocks and patterns, system fonts, and a small progressive-enhancement JavaScript layer.

> **Pre-release:** Slateframe is under active development. Validated milestones are merged into `main`; ongoing work continues on `automation/continuous-development`.

## Why Slateframe

Slateframe is designed for people who want editorial polish without inheriting a page-builder runtime.

- **Content first:** typography, spacing, rules, alignment, and imagery establish hierarchy before decorative UI.
- **WordPress first:** core templates, blocks, patterns, menus, comments, and theme APIs remain the foundation.
- **Multilingual by default:** no fixed locale list, URL convention, or multilingual plugin is required.
- **Accessible by design:** keyboard behavior, visible focus, semantic landmarks, reduced motion, resilient fallbacks, and touch targets are part of the product.
- **Performance by architecture:** system fonts, contextual assets, small native JavaScript, and explicit asset budgets.
- **Portable content:** Slateframe owns presentation, not site business logic or content storage.

## Current feature set

### Publishing and reading

- Editorial single-post and Page layouts with readable prose measure.
- Wide and full-width Gutenberg alignment without forcing normal paragraphs wider.
- Long-title handling for CJK, Latin, and long translated strings.
- Code blocks, inline code, blockquotes, pullquotes, captions, footnotes, multi-page posts, native tables, and TablePress-friendly overflow.
- Post metadata, categories/tags, previous/next navigation, comments, pagination, archives, author pages, search, and 404.
- Editor-canvas parity for title rhythm, prose width, captions, and wide/full alignment.

### Photography, portfolio, and knowledge

Slateframe currently ships eight site-neutral starter patterns across publishing, photography, portfolio, and knowledge work:

1. **Photo essay** — image-led storytelling with the native Gallery block.
2. **Project case study** — role/scope context with Context, Approach, and Outcome sections.
3. **Learning path** — a Foundation → Practice → Extend structure for educational content.
4. **Editorial note** — a restrained note/caveat that remains part of normal document flow.
5. **Curated reading list** — a typography-led related-reading section without a card wall.
6. **Photography contact sheet** — mixed portrait/landscape imagery without forced cropping.
7. **Portfolio index** — project summaries organized as an editorial ledger rather than a card grid.
8. **Knowledge outline** — prerequisites, outcomes, and a numbered learning sequence.

Block styles add editorial notes, framed images, photo sequences, contact sheets, project features, learning paths, data tables, native disclosures, numbered steps, checklists, key facts, and editorial ledgers.

### Navigation and multilingual readiness

- Primary and footer menu locations with a usable fresh-install fallback.
- Responsive navigation with Escape, outside-click, link-close behavior, focus return, and mobile focus containment.
- No-JavaScript fallback remains navigable.
- Optional language-selector integration through the public `slateframe_language_switcher_html` filter.
- Logical CSS properties, RTL corrections, CJK-safe wrapping, and long-string resilience.

## Installation

Slateframe has not reached a tagged stable release yet. For development builds:

1. Download a validated `slateframe.zip` artifact from the public CI, or build it locally.
2. In WordPress, open **Appearance → Themes → Add New → Upload Theme**.
3. Upload `slateframe.zip` and activate Slateframe.
4. Assign Primary and Footer menus if desired.
5. Configure the Site Title, Tagline, and optional Custom Logo.
6. Build content with WordPress core blocks and Slateframe patterns.

No page builder or companion plugin is required.

## Compatibility target

| Area | Current target |
| --- | --- |
| WordPress | 6.7+ |
| PHP | 7.4+ |
| `theme.json` | Version 3 |
| Editor | Gutenberg/core block editor |
| Directionality | LTR + RTL architecture |
| Languages | Locale-agnostic; CJK/RTL/long-string aware |
| Multilingual plugins | Optional adapters/hooks; none required |

Compatibility is validated incrementally rather than claimed from syntax alone.

## Quality gates

Public GitHub Actions currently enforce:

- PHP syntax.
- WordPress Coding Standards through PHPCS/WPCS.
- WordPress.org Theme Check against a real WordPress installation with `WP_DEBUG` enabled.
- `theme.json`, theme metadata, required files, and pattern metadata.
- Public namespace / Text Domain rules and guards against private Time2Log runtime identifiers.
- Guards against hard-coded locale paths and a required Polylang dependency.
- JavaScript syntax and explicit CSS/JS asset budgets.
- Real WordPress + MariaDB installation and theme activation.
- Runtime pattern registration.
- Playwright/Chromium browser regression at **320, 375, 390, 412, 768, 1440, and 1920 px**.
- Keyboard navigation, core routes, comments, overflow, wide/full blocks, long mixed-script titles, reduced motion, and reference screenshots.
- Reproducible release ZIP creation with development-only files excluded.

A failed gate is treated as a defect; tests are not removed merely to make CI green.

## Development

The long-lived integration branch is `automation/continuous-development`. Validated batches are periodically merged into `main`.

Build the distributable archive:

```bash
./bin/build-theme-zip.sh
```

Run browser tests against a local WordPress installation using Slateframe:

```bash
npm install
PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8080 npm run test:browser
```

Repository documentation:

- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Public extension points](docs/EXTENSIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Migration audit](docs/MIGRATION.md)
- [Changelog](CHANGELOG.md)

## Theme boundaries

Slateframe deliberately does **not** implement analytics, SEO metadata ownership, caching/CDN logic, business data, custom course/project storage, or a required multilingual implementation. Those responsibilities belong to WordPress core, plugins, or services.

The theme provides semantic markup and coexists with SEO, table, TOC, multilingual, and content plugins without duplicating their responsibilities.

## License

Slateframe is free software released under **GPL-3.0-or-later**. See [LICENSE](LICENSE).
