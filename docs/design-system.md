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

theme.json spacing, typography, content width, wide width, and semantic colors should remain conceptually aligned with frontend tokens. A pattern should not become unexpectedly looser or narrower merely because it is viewed in the editor. Scrollable data tables use a single scroll owner: the Core/TablePress wrapper owns overflow while the inner table may keep its intrinsic width. Core table wrappers remain on the normal reading measure and are keyboard-focusable when overflow becomes reachable at narrow widths or text zoom. The editor mirrors the same containment and wrapping model so text resizing does not turn internal table width into page-level overflow.

## Review checklist

For any visual-system change, inspect mobile and desktop, long Latin strings, CJK, RTL, keyboard focus, reduced motion, 200% text resizing, minimum/default/maximum Appearance profiles, horizontal overflow, table containment, and image/caption rhythm. Screenshot evidence is required for important visual changes before merge.


## Migration-hardening baseline

Slateframe treats recurring fixes found in long-lived child themes as design-system constraints rather than site-specific patches. These contracts are part of the default product and should be preserved when templates or block styles evolve:

- **One page-start rhythm:** core page, archive, search, author, and recovery surfaces derive header-to-content spacing from the shared section/stack/component tokens. Templates should not introduce independent hero-like top padding simply to compensate for another stylesheet.
- **Container-relative reading widths:** normal prose stays on the content measure; only explicit wide/full alignments may leave it. Reading primitives must not use `100vw` escapes to repair individual code, table, or media blocks because those rules frequently create double-gutter and horizontal-overflow regressions.
- **Intrinsic-size containment first:** prose children, grid tracks, controls, navigation items, comments, tables, and editor blocks must be allowed to shrink with `min-inline-size: 0` where intrinsic content could otherwise widen the document.
- **One accessible table scroll owner:** Core Table and plugin-style tables may scroll horizontally inside the reading measure, while the document root stays fixed. A scroll owner must be keyboard reachable and should use stable scrollbar/overscroll behavior.
- **Script-neutral display measure:** headings use an em-based measure rather than a Latin `ch` assumption, so CJK and mixed-script titles keep comparable editorial balance without dedicated URL or locale logic.
- **One control family:** navigation, language adapters, search, pagination, comment controls, disclosure controls, lightbox controls, and plugin-compatible controls inherit the same bounded touch-target and padding system. The default baseline remains at least 44px.
- **Viewport-contained mobile navigation:** expanded navigation has a viewport-derived maximum block size, local scrolling, overscroll containment, keyboard escape/focus handling, and long-label wrapping. Adding menu depth or translations must not make the page itself scroll sideways.
- **Sticky-header-aware anchors:** heading scroll offsets derive from the shared header and stack tokens instead of a template-specific literal.
- **Editor parity is a contract:** content/wide measures, intrinsic containment, title measure, spacing rhythm, captions, tables, and block styles should remain predictable between Gutenberg and the frontend.
- **Multilingual integration stays adapter-based:** Slateframe does not own a locale list, translated URL structure, Polylang/WPML/TranslatePress relationship storage, or language-specific homepage query. Integrations supply presentation through public filters.
- **Discovery stays content-model neutral:** the theme must not silently force search to posts only, assume fixed page/category IDs, or hard-code an author/profile destination.
- **Site identity stays editable:** no fallback logo mark, footer copy, project taxonomy, analytics identifier, personal URL, or fixed publishing content is embedded in runtime.

Browser coverage should reproduce the failure modes behind these rules: long CJK/mixed-script titles, long translated navigation, plain plugin-style tables, 200% text resizing, default/wide/full reading blocks, real 404 routing, and the minimum/default/maximum Appearance profiles.
