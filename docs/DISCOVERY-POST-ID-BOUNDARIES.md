# Discovery candidate and exclusion ID boundaries

Slateframe's related reading and 404 recovery queries accept optional public WordPress adapter filters. The theme does not own those plugins or change their query semantics, but must not allow malformed candidate IDs to crash rendering or widen a deliberately bounded result set.

`slateframe_discovery_positive_ids()` accepts arrays of positive decimal integers (including zero-padded numeric strings), preserves first-seen order, and removes duplicates. Objects, arrays, booleans, zero, negatives, decimal/exponent strings and overflowing values are ignored without casting to accidental post ID 1. The same strict normalization applies to `post__in`, `post__not_in` and taxonomy ID arrays.

A supplied `post__in` is always intersected with valid exclusions, including the current post. If it becomes empty or malformed, the query uses `array( 0 )` to fail closed rather than silently requesting unrestricted posts. Missing `post__in` remains absent so Core's default discovery behavior is preserved. The bounded public post type, published status, three-item page size and normal WordPress query filters remain unchanged for related posts and 404 recovery.

Run `python3 -m unittest tests/test_discovery_post_id_boundaries.py tests/test_discovery_taxonomy_ids.py` or `php tests/fixtures/discovery-post-id-boundaries.php.fixture`. These fixtures run without WordPress, a database or a production site. Exact-head GitHub Actions and WordPress integration checks remain required before merging.
