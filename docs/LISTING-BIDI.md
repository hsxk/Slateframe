# Mixed-direction listing headings and search counts

Slateframe isolates the text that its own templates place in listing headings without changing WordPress data, permalink behavior, Core blocks or plugin output.

- `archive.php` passes `<bdi>` in the before/after arguments of WordPress `the_archive_title()`. Core retains responsibility for taxonomy/date labels, prefixes and filters.
- `author.php` isolates the escaped display name and optional plain-text biography separately, while leaving the avatar filter and the original Core author metadata untouched.
- `index.php` isolates either the posts-page heading or the site name in the fallback listing.
- `search.php` already isolates the escaped query. The localized result count is now independently isolated inside the translated singular/plural message; the count, translation, search form and pagination are unchanged.

Native `bdi` chooses direction from the text and works in RTL/CJK without forced `dir=ltr`, CSS, JavaScript or dependencies. It does not change the Gutenberg Core Post Title block, Core taxonomy data, theme tokens or runtime asset budgets.

`tests/test_listing_bidi.py` executes the four PHP templates against a bounded WordPress output fixture, covering both index branches, Core archive prefix, author bio, search query and plural count. `tests/browser/listing-bidi.spec.js` exercises real WordPress home and author routes plus a disposable Core category archive at 320/375/390/412/768/1440/1920px, LTR/RTL, 100%/400% text, Axe and forced colors. Eight exact-HEAD screenshots (mobile RTL, mobile forced colors and desktop LTR for each route) must be downloaded and visually reviewed before merging. The Core category fixture is created and removed with WP-CLI; the archive title is also covered by executable PHP to preserve Core's before/after contract.
