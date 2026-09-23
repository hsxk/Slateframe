# Migration audit

Slateframe is derived from engineering lessons learned while developing an earlier private publishing theme. It is not a rename of that site theme.

## Kept and generalized

Hybrid theme architecture, design-token discipline, semantic template hierarchy, lightweight responsive navigation, long-form reading primitives, contextual asset strategy, block styles, reduced-motion support, and browser/runtime testing practices.

## Explicitly rejected from the public theme

Site names and URLs; personal author copy; fixed project/course/gallery content; post-only search behavior; page IDs/slugs; production data/configuration; hard-coded locale lists or locale URL paths; and a core dependency on Polylang or any other multilingual plugin.

## Public namespace contract

PHP APIs use `slateframe_`; CSS classes use `slateframe-`; CSS custom properties use `--slateframe-*`; block styles and patterns use `slateframe-*`; source strings use the `slateframe` text domain.

## Multilingual boundary

Core uses WordPress locale/i18n APIs only. Multilingual plugins may inject a selector through the `slateframe_language_switcher_html` filter. Core remains functional when no multilingual plugin is active.
