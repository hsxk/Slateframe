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
- **Contextual assets:** long-form reading presentation is loaded only on singular documents, while photography, portfolio, and knowledge presentation is layered on only when relevant blocks appear.
- **Portable content:** Slateframe owns presentation, not site business logic or content storage.

## Appearance and spatial system

Slateframe uses one coherent spatial system instead of sizing each component independently. Its default visual language is restrained and editorial: a 44px accessible control baseline, semantic inline/component/stack/media/caption gaps, dedicated prose/heading/list reading rhythm, responsive page gutters, deliberate section whitespace, a readable 46rem text measure, a 74rem wide canvas, and one shared corner-radius language. Navigation, forms, comments, search, pagination, panels, media captions, and editorial layouts consume those tokens rather than maintaining separate sizing systems.

Site owners can tune eight bounded settings in **Appearance → Customize → Slateframe design**: color mode, control size, spacing density, page gutter, section whitespace, corner radius, reading width, and wide canvas. Color mode can follow the visitor's operating-system preference or establish a light/dark site default. Visitors also get a compact 44px header toggle; an explicit choice is stored only as a first-party functional preference cookie and takes precedence over the site default. Control size cannot fall below 44px, and every numeric range is intentionally narrow enough to preserve Slateframe's proportions rather than exposing arbitrary CSS.

The light and dark palettes share the same semantic surface hierarchy, text, border, accent, focus, selection, and media-chrome tokens. System mode requires no JavaScript, while explicit site defaults are present in server-rendered HTML to avoid a theme flash. Block authors get the matching semantic color presets, XS–2XL spacing presets, and Small/Body/Lead/Heading/Display typography presets in the editor. Changed spatial settings and explicit site color defaults are mirrored into the block-editor canvas.

CI renders the designed default plus the minimum/compact and maximum/spacious spatial profiles at representative mobile and desktop widths, and separately exercises system, explicit-light, and explicit-dark color modes. The profiles are checked for control targets, real content/wide measures, gutters, radius, component and reading-rhythm tokens, content-mode overflow, color persistence, accessible toggle state, and screenshot evidence.

## Current feature set

### Publishing and reading

- Editorial single-post and Page layouts with readable prose measure.
- Wide and full-width Gutenberg alignment without forcing normal paragraphs wider.
- Long-title handling for CJK, Latin, and long translated strings.
- Code blocks, inline code, blockquotes, pullquotes, captions, footnotes, multi-page posts, native tables, TablePress-friendly overflow, table-of-contents treatment, editorial leads, and print-friendly long-form output.
- Post metadata, categories/tags, previous/next navigation, comments, pagination, archives, author pages, search, and 404.
- Editor-canvas parity for the singular reading layer: title rhythm, H2/H3 hierarchy, nested-list rhythm, quotes, inline code, tables, captions, wide/full alignment, and bounded Appearance token overrides.

### Photography, portfolio, and knowledge

Slateframe currently ships twenty-one site-neutral starter patterns across publishing, photography, portfolio, and knowledge work:

1. **Photo essay** — image-led storytelling with the native Gallery block.
2. **Project case study** — role/scope context with Context, Approach, and Outcome sections.
3. **Learning path** — a Foundation → Practice → Extend structure for educational content.
4. **Editorial note** — a restrained note/caveat that remains part of normal document flow.
5. **Curated reading list** — a typography-led related-reading section without a card wall.
6. **Photography contact sheet** — mixed portrait/landscape imagery without forced cropping.
7. **Portfolio index** — project summaries organized as an editorial ledger rather than a card grid.
8. **Knowledge outline** — prerequisites, outcomes, and a numbered learning sequence.
9. **Photography feature** — a single natural-ratio image with restrained editorial context.
10. **Project brief** — context, role, constraints, and outcome without a custom content type.
11. **Lesson chapter** — objective, practice sequence, and explicit continuation for educational content.
12. **Editorial opening** — a lead paragraph and compact orientation for long-form reading.
13. **Photography diptych** — two natural-ratio frames that collapse cleanly on narrow screens.
14. **Project outcomes** — a portable three-column metrics summary without a custom project model.
15. **Knowledge definition** — a semantic term-and-explanation callout for reference material.
16. **Photography sequence** — an establishing frame plus paired detail rhythm with natural-ratio imagery and captions.
17. **Project grid** — a native Query Loop portfolio index with responsive cards, site-local date formatting, empty state, and pagination.
18. **Knowledge checklist** — a compact Understand → Practise checkpoint built from core Columns, Lists, and Quote blocks.
19. **Project decision log** — a constraint → decision → consequence trail with an explicit evidence prompt.
20. **Knowledge procedure** — a goal → action → verification workflow with a recovery checkpoint.
21. **Knowledge comparison** — a two-option editorial comparison organized around fit, limits, and a decision rule.

Block styles add editorial notes and leads, framed images, photo sequences, contact sheets, diptychs, photography features, project features/briefs/metrics, learning paths/callouts/definitions, data tables, native disclosures, numbered steps, checklists, key facts, and editorial ledgers. Portfolio and knowledge patterns deliberately compose those shared styles instead of introducing one-off component CSS.

### Navigation and multilingual readiness

- Primary and footer menu locations with a usable fresh-install fallback.
- Responsive navigation with Escape, outside-click, link-close behavior, focus return, and mobile focus containment.
- No-JavaScript fallback remains navigable, and system light/dark preference still works without JavaScript.
- Accessible light/dark header control with server-rendered site defaults and a first-party visitor preference cookie.
- Optional language-selector integration through the public `slateframe_language_switcher_html` filter.
- Extensible contextual-style detection through `slateframe_content_mode_markers`, without hard-coding multilingual or plugin APIs.
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

Compatibility is validated incrementally rather than claimed from syntax alone. CI currently exercises the minimum PHP target and the primary modern PHP runtime against WordPress 6.7 and current WordPress.

## Quality gates

Public GitHub Actions currently enforce:

- PHP syntax.
- WordPress Coding Standards through PHPCS/WPCS.
- Release metadata consistency across `style.css`, `readme.txt`, and `package.json`.
- WordPress.org Theme Check against the built production ZIP in a real WordPress installation with `WP_DEBUG` enabled; REQUIRED findings block the build while advisory recommendations remain visible in the report.
- WordPress/PHP compatibility smoke coverage for the minimum PHP target and modern PHP runtime.
- `theme.json`, theme metadata, required files, and pattern metadata.
- Public namespace / Text Domain rules and guards against private Time2Log runtime identifiers.
- Guards against hard-coded locale paths and a required Polylang dependency.
- JavaScript syntax and explicit budgets for the base stylesheet, always-loaded navigation, contextual comments/content-mode CSS, and JavaScript, so every shipped request is counted.
- Real WordPress + MariaDB installation and theme activation.
- Runtime pattern registration.
- Playwright/Chromium browser regression at **320, 375, 390, 412, 768, 1440, and 1920 px**, plus compact/default/spacious spatial profiles and system/light/dark color-mode profiles at representative mobile and desktop widths.
- Keyboard navigation, threaded comments, core routes, classic alignment/caption compatibility, overflow, wide/full blocks, long mixed-script titles, reduced motion, Photography/Portfolio/Knowledge responsive layouts, intrinsic image sizing, Query Loop pagination, and reference screenshots.
- Automated Axe WCAG A/AA regression on representative mobile/desktop routes, plus explicit visible-focus, accessible-name, and 44 px touch-target checks.
- Reproducible release ZIP creation with development-only files excluded, required WordPress.org metadata, and a validated 1200×900 theme screenshot.

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

Run only the accessibility regression slice:

```bash
PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8080 npm run test:a11y
```

Automated checks are a regression baseline, not a claim of complete WCAG conformance; manual keyboard, zoom, screen-reader, and visual review remain part of release work.

Repository documentation:

- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Public extension points](docs/EXTENSIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [WordPress.org readiness](docs/WORDPRESS-ORG.md)
- [Migration audit](docs/MIGRATION.md)
- [Changelog](CHANGELOG.md)

## Theme boundaries

Slateframe deliberately does **not** implement analytics, SEO metadata ownership, caching/CDN logic, business data, custom course/project storage, or a required multilingual implementation. Those responsibilities belong to WordPress core, plugins, or services.

The theme provides semantic markup and coexists with SEO, table, TOC, multilingual, and content plugins without duplicating their responsibilities.

## License

Slateframe is free software released under **GPL-3.0-or-later**. See [LICENSE](LICENSE).
