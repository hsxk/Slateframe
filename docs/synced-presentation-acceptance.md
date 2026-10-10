# Slateframe — Synced Pattern Presentation Acceptance

## Scope

WordPress Core `core/block` references inside singular post and Page content can carry Slateframe's contextual presentation markers or native image/gallery lightbox flags. The theme must discover these styles **before enqueue**, without rendering blocks, executing shortcodes, loading plugins, or applying content-specific URL rules.

The shared resolver `slateframe_synced_pattern_contents()` accepts parsed Core blocks, visits only published `wp_block` posts, rejects malformed refs and non-pattern posts, and stops after eight synced-reference hops. Ordinary `core/group` nesting does not consume the reference budget. A shorter path may revisit a pattern to reach descendants that a longer path could not inspect; cycles remain bounded. Singular requests cache resolved contents by post ID and content hash, shared across Photography, Portfolio, Knowledge, Query Loop, and form asset decisions. Footer widget form detection retains its own conditional scan and request-local cache.

## Required integration scenarios (real WordPress)

1. Singular Page -> published synced `core/image` with `lightbox.enabled=true` -> `slateframe-photography` present and Core lightbox opens with keyboard/close controls.
2. Singular Page -> published synced contact-sheet gallery style -> Photography present; no unrelated Query Loop CSS.
3. Singular post -> synced `slateframe-project-grid` Query Loop -> both `slateframe-content-modes` and `slateframe-query-loop` present, no duplicate styles.
4. Singular Page -> synced Knowledge checklist/learning callout -> `slateframe-content-modes` present.
5. Nested synced references and normal Group containers preserve content and depth semantics; repeated references do not multiply requests unnecessarily.
6. Draft/deleted/non-`wp_block` references and plain prose mentioning a class name do not enqueue contextual styles.
7. A pattern cycle terminates, and a shallow repeated reference can reach descendants hidden by the first deep path.
8. Published synced Core Search, legacy Search, and authored HTML forms retain existing form asset behavior.
9. On the seven viewport widths 320/375/390/412/768/1440/1920, test compact/default/spacious, RTL/CJK, 200% zoom, forced colors, keyboard/focus, and native Core lightbox geometry.
10. Capture screenshots from **the exact PR HEAD SHA's** WordPress+Chromium Actions artifacts. Review post, Page, Photography/Lightbox, Portfolio, Knowledge, Header, Footer, Search, and Forms before merging.

## Local checks (not CI acceptance)

The isolated PHP harness in `tests/synced-presentation.php` verifies 51 assertions, including CSS enqueue handles/dependencies, published-only resolution, cycles, repeated refs, depth, and no form-style leakage. It uses test stubs and is **not** a real WordPress test. New code must pass PHP 7.4/8.3, WPCS, Theme Check, WordPress browser tests, package reproducibility, and screenshot review at the exact new SHA before release.

## Boundaries

No changes to production sites, SEO/analytics/cache behavior, paid features, JavaScript dependencies, or external service configuration. Only generic presentation assets and their tests are in scope.
