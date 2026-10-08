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

The six editor spacing presets (`XS` through `2XL`) resolve from `--slateframe-space-2` … `--slateframe-space-4`, with larger presets expressed as semantic multiples of the same scale. Appearance spacing density therefore changes the Gutenberg preset scale and the published frontend together instead of maintaining a fixed parallel scale.

Footer columns and optional footer-widget content are sibling components, so their internal separation derives from stack rhythm; section whitespace remains reserved for the footer's relationship to the page above. Footer widgets render in a responsive auto-fit grid, reset list chrome, and keep links on the shared control-height baseline; the brand/navigation/copyright row becomes a single logical column on narrow screens. The footer stylesheet is a global shell asset alongside navigation and remains inside the unchanged aggregate base-runtime budget.

Native Portfolio Query Pagination uses the same control radius, touch target, inline/component gaps, and current-state surface hierarchy as archive pagination. Project cards must remain coherent when a post has no featured image; absence of media never creates a fake placeholder or content-model dependency. Cards use one vertical flow, media consumes the shared media gap, and dates settle to the row baseline so mixed image/no-image items remain comparable without manufacturing empty media. The starter Query Loop uses the existing Lead typography preset for project titles rather than an undefined Large preset.

Long-form hierarchy extends through H6: H2–H6 share the same section-entry rhythm, while lower heading sizes stay at a readable text baseline. Native definition lists remove browser-specific inline indentation and use the component gap to expose term/description relationships; thematic separators reuse heading rhythm and the shared border token. Threaded comments use a logical inline-start guide and bounded indentation so hierarchy remains legible in both LTR and RTL without consuming the mobile reading width.

The accessible control baseline is 44px on both axes. Customizer settings may increase it, but must not reduce it. Short translated navigation, footer, reply/cancel, pagination, and button labels therefore keep a complete minimum target instead of satisfying the baseline on height alone.

Primary navigation has a hard compact baseline at 1280px and below, then remains content-aware above that breakpoint: if the site identity, translated menu labels, optional language adapter, and header controls cannot coexist without overflow, the same keyboard-accessible compact menu is used. The site title and visible tagline are content, not disposable chrome: long multilingual identity text wraps instead of being ellipsized. At the narrowest mobile widths the identity owns the first flex row and controls move below it; the header deliberately becomes flow-relative instead of sticky so 200% text enlargement cannot pin an oversized identity over the viewport. Compact navigation remains keyboard reachable below that expanded header, and normal sticky behavior resumes above the narrow-mobile threshold. When inline space returns, the wide row is restored. No-JavaScript navigation remains visible and wrapping rather than being hidden behind the enhancement layer.

## Widths

Reading content defaults to 46rem. Wide editorial layouts default to 74rem. Site chrome uses a separate 108rem ceiling so navigation can use large displays without widening article content. Wide media must not force ordinary prose to grow beyond the reading measure. Long translated strings and CJK titles must wrap without horizontal overflow. Intrinsic sizing is part of that contract: emergency wrapping must also reduce min-content width so 200% text resizing cannot silently widen the root document.

## Controls

Buttons, text inputs, selects, pagination targets, menu controls, language integrations, footer actions, comment controls, and lightbox controls should share the same minimum target, focus language, radius family, and text baseline. This includes Core Search, Core Buttons, native archive pagination, Query Pagination, comment consent labels, reply-cancel links, and comment navigation. Long translated action labels must wrap inside the viewport rather than widen the document. The shared `--slateframe-rule` token owns the ordinary one-pixel semantic border so control and divider surfaces do not duplicate border composition across assets. Visual compactness should come from border and typography choices, not inaccessible hit areas. Disabled controls use the same restrained opacity/cursor language instead of component-specific treatments.

Native semantic forms inherit the same control size, padding, radius, border, surface, focus, and wrapping system as Search and comments. The common geometry is delivered by a contextual form layer: Search/recovery pages, open discussions, Core Search blocks, and documents containing real form markup opt in automatically; form-free archives and Photography pages do not pay for it. Theme-owned search layout is split again from generic controls, while authored readonly/invalid/group/help states load only when stored singular content contains an actual form. Integrations that render forms dynamically can opt in through `slateframe_forms_styles_needed` and `slateframe_form_content_styles_needed` without introducing plugin-specific runtime dependencies. Text-like inputs, selects, and textareas remain shrinkable and full-width inside their container; readonly fields use the soft surface, placeholders use muted text at full opacity, and `aria-invalid="true"` receives a semantic danger boundary without replacing the focus ring. Fieldset/legend grouping is responsive and uses logical padding. Submit-image controls (`input[type="image"]`) are intentionally excluded from text-input and button normalization, retaining their intrinsic image size, accessible alternate label, keyboard focus, and native submit behavior. The real WordPress browser fixture checks their dimensions and focus order under default, compact, and spacious Appearance profiles. Gutenberg Core Search evidence uses the Core block control class rather than assuming any specific HTML tag, with focused editor screenshots at mobile and desktop widths. Forced-colors mode keeps explicit control boundaries and makes invalid fields structurally distinct rather than depending on color alone.

Editorial micro-primitives are part of the same system: `kbd` and `samp` use the theme mono stack, keyboard hints have a restrained physical-key boundary, `mark` uses the semantic selection surface, and titled abbreviations use a readable dotted underline. These primitives are deliberately native HTML so they remain portable between Gutenberg, Classic content, and plugin output.

## Contextual assets

Common TOC compatibility is split by responsibility: the singular reading layer guarantees shared touch-target/link geometry, while contextual publishing styles own optional TOC surface decoration. This keeps interaction accessibility present on every readable singular document without pushing decorative compatibility into the global shell.


Slateframe loads specialized presentation only when the current singular document actually uses it. Context detection matches exact CSS class tokens in stored markup rather than raw substrings, so prose or code samples that merely mention a class name cannot opt a page into extra CSS. Portfolio Query Loop presentation uses the public `slateframe_query_loop_markers` filter and automatically brings the shared content-mode layer with it; integrations therefore do not need a page ID, slug, post type, taxonomy, locale route, or multilingual plugin assumption.

## Core media surfaces

Featured media is presentation, not content ownership. Posts and Pages share one hero contract, intrinsic responsive image markup comes from WordPress Core, and attachment captions remain attachment data. Attachment pages reuse the reading measure, entry-footer metadata hierarchy, and shared action-link control family rather than introducing a parallel component scale. Missing titles must never create empty navigation targets: public discovery surfaces use the translatable Slateframe untitled fallback.

## Photography and media

Photography uses the same spatial language instead of maintaining a parallel set of gallery numbers. Contact sheets, diptychs, and sequences consume `--slateframe-media-gap`; captions consume `--slateframe-caption-gap`; feature media enters the document using stack/component rhythm. Images preserve their intrinsic ratio and use dynamic viewport caps rather than fixed crops.

Photography frontend rules are isolated in `assets/css/photography.css`; WordPress Core's native lightbox remains the interaction owner. Slateframe only supplies presentation safeguards: the shared control target and radius family, deliberate control contrast, manipulation-safe touch behavior, dynamic-viewport containment, notch/safe-area-aware media and close placement, focus visibility, forced-colors resilience, scroll/overscroll locking, and reduced-motion handling. These guarantees must survive RTL and 200% text enlargement without widening the root document. The theme does not fork Core's lightbox JavaScript. Focused runtime evidence must include real raster landscape, portrait, and square attachments with responsive candidates, natural-ratio gallery presentation, long multilingual captions, and both page-level and opened-lightbox screenshots captured after Core's zoom transition has settled; SVG fixtures or transitional animation frames are not sufficient proof of raster behavior.

Reduced motion is a system-wide presentation contract: decorative hover transforms and transitions must settle immediately when `prefers-reduced-motion: reduce` is active, including portfolio media outside the lightbox.

## Appearance bounds

Customizer ranges are product guardrails, not arbitrary CSS editors. Minimum/default/maximum states must remain visually balanced across header, search, article, galleries, portfolio patterns, knowledge patterns, pagination, comments, and footer. Page, showcase, photography, portfolio, and knowledge evidence is captured at representative mobile and desktop widths for all three spatial profiles so layout changes are reviewed rather than inferred from token values alone. Photography profile evidence must also open the real Core lightbox: its close target follows the active control-size/radius tokens, long multilingual captions stay contained, keyboard focus returns after Escape, and focused overlay screenshots are retained for both representative widths.

## Direction and language

Prefer logical properties. UI copy is translatable with the slateframe text domain. Do not encode locale lists, language URL structures, or plugin-specific assumptions in the visual system.

## Editor parity

theme.json spacing, typography, content width, wide width, and semantic colors should remain conceptually aligned with frontend tokens. A pattern should not become unexpectedly looser or narrower merely because it is viewed in the editor. Scrollable data tables use a single scroll owner: the Core/TablePress wrapper owns overflow while the inner table may keep its intrinsic width. Core table wrappers remain on the normal reading measure and are keyboard-focusable when overflow becomes reachable at narrow widths or text zoom. The editor mirrors the same containment and wrapping model so text resizing does not turn internal table width into page-level overflow. CI must also open representative registered patterns in an authenticated real Gutenberg canvas, reject invalid blocks, check mobile/desktop containment, and retain screenshot evidence; registry presence or stylesheet registration alone is not editor-parity proof. Shipped starter patterns remain part of that validity check, while deterministic visual evidence may use fixture-owned Core content so unrelated default posts or empty media placeholders cannot masquerade as authoring proof. Photography evidence therefore includes real landscape/portrait media in the editor, and Portfolio evidence uses an isolated native Query Loop dataset without changing the public pattern's generic query semantics. Full editor screenshots retain WordPress chrome for authentic authoring review; focused block evidence may temporarily suppress only outer fixed admin/editor overlays so the captured region cannot be obscured, and the suppression must be removed before the test continues.

## Review checklist

For any visual-system change, inspect mobile and desktop, long Latin strings, CJK, RTL, keyboard focus, reduced motion, 200% text resizing, minimum/default/maximum Appearance profiles, horizontal overflow, table containment, and image/caption rhythm. Screenshot evidence is required for important visual changes before merge.


## Migration-hardening baseline

Slateframe treats recurring fixes found in long-lived child themes as design-system constraints rather than site-specific patches. These contracts are part of the default product and should be preserved when templates or block styles evolve:

- **One page-start rhythm:** core page, archive, search, author, and recovery surfaces derive header-to-content spacing from the shared section/stack/component tokens. Templates should not introduce independent hero-like top padding simply to compensate for another stylesheet.
- **Container-relative reading widths:** normal prose stays on the content measure; only explicit wide/full alignments may leave it. Reading primitives must not use `100vw` escapes to repair individual code, table, or media blocks because those rules frequently create double-gutter and horizontal-overflow regressions.
- **Intrinsic-size containment first:** prose children, grid tracks, controls, navigation items, comments, tables, and editor blocks must be allowed to shrink with `min-inline-size: 0` where intrinsic content could otherwise widen the document.
- **One accessible table scroll owner:** Core Table and plugin-style tables may scroll horizontally inside the reading measure, while the document root stays fixed. A scroll owner must be keyboard reachable, use stable scrollbar/overscroll behavior, and preserve a readable minimum column measure instead of collapsing cells into character-by-character wrapping.
- **Script-neutral display measure:** headings use an em-based measure rather than a Latin `ch` assumption, so CJK and mixed-script titles keep comparable editorial balance without dedicated URL or locale logic.
- **One control family:** navigation, language adapters, search, pagination, comment controls, disclosure controls, lightbox controls, and plugin-compatible controls inherit the same bounded touch-target and padding system. The default baseline remains at least 44px.
- **Viewport-contained mobile navigation:** expanded navigation has a viewport-derived maximum block size, local scrolling, overscroll containment, keyboard escape/focus handling, and long-label wrapping. Adding menu depth or translations must not make the page itself scroll sideways.
- **Sticky-header-aware anchors:** heading scroll offsets derive from the shared header and stack tokens instead of a template-specific literal.
- **Editor parity is a contract:** content/wide measures, intrinsic containment, title measure, spacing rhythm, captions, tables, and block styles should remain predictable between Gutenberg and the frontend.
- **Multilingual integration stays adapter-based:** Slateframe does not own a locale list, translated URL structure, Polylang/WPML/TranslatePress relationship storage, or language-specific homepage query. Integrations supply presentation through public filters.
- **Discovery stays content-model neutral:** the theme must not silently force search to posts only, assume fixed page/category IDs, or hard-code an author/profile destination.
- **Site identity stays editable:** no fallback logo mark, footer copy, project taxonomy, analytics identifier, personal URL, or fixed publishing content is embedded in runtime.

Browser coverage should reproduce the failure modes behind these rules: long CJK/mixed-script titles, long translated navigation, plain plugin-style tables, 200% text resizing, default/wide/full reading blocks, real 404 routing, and the minimum/default/maximum Appearance profiles.

## Mobile identity and native content pagination

At phone widths, an ordinary short site identity shares the header row with the color and menu controls. The brand owns the remaining flexible space. On exceptionally long translated names or 200% text zoom, the header flex line wraps and moves color/navigation controls below the complete brand, without clipping the name or pushing 44px controls outside the viewport. Short names retain the single-row arrangement. The mobile Search layout belongs to its contextual stylesheet, not the global shell.

Native WordPress `<!--nextpage-->` breaks in posts and Pages render inside a labelled `slateframe-content-pages` navigation landmark. Core owns current-page semantics; each number uses shared control height, spacing, radius, and logical wrapping. Appearance compact/default/spacious must preserve keyboard reachability and responsive containment without a pagination plugin.
