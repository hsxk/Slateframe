# Core author and attachment metadata type boundaries

Slateframe renders presentation only; WordPress Core and installed integrations own the author record and attachment metadata. A malformed filter result must not turn an array, object, boolean, fractional number, or overflowing decimal into a valid-looking author ID, image dimension, or file size.

`slateframe_positive_int()` accepts positive PHP integers and positive decimal integer strings that round-trip without overflow. Leading zeroes are accepted, but zero, negatives, scientific notation, fractions, booleans, arrays, objects, and overflow are rejected. The same narrow conversion is used for author IDs, image width/height and attachment file size; no database lookup or extra frontend asset is introduced.

A malformed author ID suppresses only the default author archive link, retaining a valid escaped name. A malformed author name suppresses the byline while keeping the published date. For attachments, dimensions are displayed only when both width and height are valid positive integers, and file size is shown only for a valid positive integer. MIME output remains Core-provided and is omitted when not a string. The public `slateframe_attachment_details` presentation filter continues to accept only non-empty string labels and values.

## Regression and acceptance

`python3 -m unittest tests/test_core_metadata_boundaries.py` runs the real PHP functions against disposable Core stubs, converts PHP warnings into failures, and exercises multilingual names, valid numeric strings, invalid types, overflows, and partial metadata. `php -l tests/fixtures/core-metadata-boundaries.php.fixture` checks syntax. The tests and documentation must not enter the distributable theme ZIP.

Before merging, require the exact PR HEAD SHA's WordPress/PHP compatibility, WPCS, Theme Check, static budgets, browser checks, and reproducible packaging Actions. The existing visual evidence must not be attributed to a different SHA. No production site or legacy personal content is involved.
