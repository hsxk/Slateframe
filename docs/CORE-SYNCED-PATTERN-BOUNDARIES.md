# Core synced-pattern asset discovery boundaries

Slateframe discovers contextual CSS for **published** WordPress Core synced patterns (`core/block` references) without rendering blocks, executing shortcodes, or creating a separate content model. The same resolver serves forms, Photography, Portfolio/Knowledge and Query Loop presentation.

## Input and traversal rules

- A parsed block must be an array. A `core/block` reference is read only when `attrs` is an array and `ref` is a positive integer or a decimal digit string.
- Invalid attributes (including objects), invalid references and unpublished/non-`wp_block` targets are ignored rather than passed to Core APIs.
- A referenced `WP_Post` must have **string** `post_content` before Slateframe stores or parses it. Singular post content is likewise validated before `has_block()` and cache-key hashing.
- Only nested `core/block` references consume the eight-reference depth budget. Core Group/Columns nesting does not. The shallowest visited depth per reference prevents cycles while allowing a shorter path to discover descendants.
- Password-protected singular content is not inspected for contextual assets. Public footer content is resolved independently.

This is defensive handling for malformed imports and filtered data; normal WordPress Core block markup and native Image/Gallery lightbox behavior are unchanged. It does not enable external fetching, custom post types, SEO, analytics or plugin-specific logic.

## Regression and release gate

`python3 -m unittest tests/test_contextual_asset_guards.py` executes the **actual theme PHP functions** with a Core stub that rejects non-string `has_block()` input. The fixture covers malformed block trees, attrs, references, published content, singular form caches, nested groups, deduplication and depth limits.

The fixture is test-only and excluded from the WordPress.org ZIP. Exact-HEAD GitHub Actions (WP/PHP compatibility, WPCS, Theme Check, static budgets, real WordPress+Chromium and accessibility) remain the acceptance authority; local unit checks alone do not establish release readiness.
