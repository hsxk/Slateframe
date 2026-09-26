# Slateframe design system

Slateframe's visual language is restrained, editorial, quiet, and precise. Layout should create hierarchy with type, proportion, alignment, whitespace, and imagery before decoration.

## Spatial roles

Do not use one generic gap for every relationship. Use the closest semantic role:

- inline gap: tightly related inline metadata and icon/text pairs
- control padding: space inside interactive controls
- component gap: controls or elements that form one component
- stack gap: sibling components in one region
- prose gap: paragraph-level reading rhythm
- heading gap and heading-after: section hierarchy
- list-item gap: rhythm inside lists
- media gap: relationships between images in galleries
- caption gap: media-to-caption relationship
- section whitespace: separation between major page regions
- page gutter: safe viewport edge spacing

The accessible control baseline is 44px. Customizer settings may increase it, but must not reduce it.

## Widths

Reading content defaults to 46rem. Wide editorial layouts default to 74rem. Wide media must not force ordinary prose to grow beyond the reading measure. Long translated strings and CJK titles must wrap without horizontal overflow. Intrinsic sizing is part of that contract: emergency wrapping must also reduce min-content width so 200% text resizing cannot silently widen the root document.

## Controls

Buttons, text inputs, selects, pagination targets, menu controls, language integrations, comment controls, and lightbox controls should share the same minimum target, focus language, radius family, and text baseline. Visual compactness should come from border and typography choices, not inaccessible hit areas.

## Photography and media

Photography uses the same spatial language instead of maintaining a parallel set of gallery numbers. Contact sheets, diptychs, and sequences consume `--slateframe-media-gap`; captions consume `--slateframe-caption-gap`; feature media enters the document using stack/component rhythm. Images preserve their intrinsic ratio and use dynamic viewport caps rather than fixed crops.

WordPress Core's native lightbox remains the interaction owner. Slateframe only supplies presentation safeguards: the shared control target, dynamic-viewport containment, scroll/overscroll locking, safe-area-aware close placement, focus visibility, and reduced-motion handling. The theme does not fork Core's lightbox JavaScript.

## Appearance bounds

Customizer ranges are product guardrails, not arbitrary CSS editors. Minimum/default/maximum states must remain visually balanced across header, search, article, galleries, portfolio patterns, knowledge patterns, pagination, comments, and footer. Page, showcase, photography, portfolio, and knowledge evidence is captured at representative mobile and desktop widths for all three spatial profiles so layout changes are reviewed rather than inferred from token values alone.

## Direction and language

Prefer logical properties. UI copy is translatable with the slateframe text domain. Do not encode locale lists, language URL structures, or plugin-specific assumptions in the visual system.

## Editor parity

theme.json spacing, typography, content width, wide width, and semantic colors should remain conceptually aligned with frontend tokens. A pattern should not become unexpectedly looser or narrower merely because it is viewed in the editor. Scrollable data tables use a single scroll owner: the Core/TablePress wrapper owns overflow while the inner table may keep its intrinsic width. The editor mirrors the same containment and wrapping model so text resizing does not turn internal table width into page-level overflow.

## Review checklist

For any visual-system change, inspect mobile and desktop, long Latin strings, CJK, RTL, keyboard focus, reduced motion, 200% text resizing, minimum/default/maximum Appearance profiles, horizontal overflow, table containment, and image/caption rhythm. Screenshot evidence is required for important visual changes before merge.
