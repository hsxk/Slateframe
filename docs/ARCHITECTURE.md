# Slateframe architecture

Slateframe is a **hybrid WordPress theme**: `theme.json` provides editor/design-system integration while PHP template hierarchy files provide predictable, portable server-rendered presentation.

## Layers

### 1. Design system

`theme.json` and `--slateframe-*` CSS custom properties define the shared palette, typography, layout measures, control/component spacing, prose/heading/list reading rhythm, radii, motion, and editor-facing presets. The editor block gap uses the same prose-rhythm token as the frontend so authored spacing remains predictable. Bounded Customizer changes are serialized once by `slateframe_customizer_spatial_css()` and injected into both frontend styles and the block-editor `styles` setting, preventing Appearance values from diverging between editing and published views.

Repeated visual values should become tokens rather than drift across component files.

### 2. Templates

Core WordPress template hierarchy files own page-level presentation: posts, Pages, archives, authors, search, comments, pagination, and 404.

Templates must not contain site-specific content, fixed page IDs/slugs, locale URL assumptions, analytics, SEO ownership, or business data.

### 3. Reusable presentation

Patterns provide portable editorial compositions. Block styles alter presentation of core blocks without creating proprietary content formats.

Content inserted through patterns remains ordinary WordPress block content and survives a theme change.

### 4. Contextual content modes

Photography, portfolio, and knowledge block-style CSS lives in `assets/css/content-modes.css`. The frontend requests it only for singular content containing relevant core blocks; the block editor always receives the same styles for parity.

This keeps archive and navigation pages on the smaller base stylesheet without hiding pattern functionality behind JavaScript. The public `slateframe_content_mode_markers` filter allows integrations to append stable, site-neutral content markers without making a plugin or locale scheme part of core.

### 5. Progressive enhancement

Frontend JavaScript is intentionally small. Navigation behavior enhances usable server-rendered markup; the theme must remain navigable without JavaScript.

### 6. Integrations

Optional integrations enter through public hooks/filters. Slateframe core does not depend on Polylang, WPML, TranslatePress, Yoast, Rank Math, TablePress, or other plugins.

## Public namespace

- PHP: `slateframe_`
- CSS classes: `slateframe-`
- CSS custom properties: `--slateframe-`
- patterns: `slateframe/*`
- block styles: `slateframe-*`
- Text Domain: `slateframe`

## Theme/plugin boundary

Slateframe owns presentation, responsive behavior, editor styles, accessibility-oriented markup, and layout compatibility.

Plugins/services should own SEO metadata/schema, analytics, caching/CDN, custom business data, workflow features, course/project data models, and complex media processing.

## Performance model

Slateframe prefers system fonts, contextual CSS, native browser behavior, explicit asset budgets, and minimal DOM wrappers. New runtime dependencies require a measurable product benefit and should not be added merely for visual decoration.

## Accessibility model

WCAG 2.2 practices guide interaction and layout work. Automated checks are useful gates but do not replace keyboard behavior, semantic review, touch-target checks, reduced-motion behavior, and visual inspection.
