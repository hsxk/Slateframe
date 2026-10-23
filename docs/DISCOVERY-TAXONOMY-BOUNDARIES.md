# Related-reading taxonomy adapter boundaries

Slateframe's related-reading query remains WordPress Core-first and post-only. Core taxonomy APIs normally return arrays of positive integer term IDs when requested with fields=ids. Public taxonomy filters may return a WP_Error, null, a scalar, or mixed values; these must not crash article rendering or silently turn invalid objects into term ID 1.

slateframe_discovery_taxonomy_ids() accepts arrays only, preserves positive decimal integer IDs in original order, normalizes leading zeros, deduplicates IDs, and ignores malformed, nested, boolean, negative, zero, and overflowing values. No locale-specific behavior or plugin dependency is introduced.

The query keeps its three tiers: tags, categories, then recent published posts. An invalid tag response skips the tag tier without hiding a valid category response. Existing post-only, publish-only, three-item, source-exclusion, candidate-intersection, and normal WordPress query-filter invariants remain intact.

Run python3 -m unittest tests/test_discovery_taxonomy_ids.py and php tests/fixtures/discovery-taxonomy-ids.php.fixture. The fixture does not contact a database or production site and is excluded from the distributable ZIP. Formal acceptance still requires exact-head GitHub Actions, WordPress compatibility, Theme Check, browser smoke, and visual review.
