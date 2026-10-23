# Public entry-filter return types

Slateframe exposes narrow presentation hooks without owning profiles, taxonomy content, SEO, or plugin routing. Integrations may customize an author byline destination with `slateframe_author_url`, or supply taxonomy HTML through `slateframe_entry_categories_html` and `slateframe_entry_tags_html`.

The author URL hook expects a URL string. A valid relative or absolute URL is escaped for HTML output; an empty string, unsupported scheme, or non-string result produces a plain-text byline instead of a broken or unnamed anchor. This allows an integration to suppress author archive links without suppressing the author's name. An invalid plugin return never becomes an `href=""` link.

The taxonomy hooks expect HTML strings. Non-string values are ignored independently, so a malformed categories response cannot remove a valid tags response (or vice versa). All accepted markup continues through WordPress `wp_kses_post()` at the final output boundary. Empty results omit the taxonomy footer.

The regression uses a disposable PHP stub fixture and covers default and custom links, invalid arrays/objects, unsafe URL schemes, valid taxonomy HTML, invalid taxonomy values, escaped author names, and post-only template guards. The fixture is not distributed in the theme ZIP. WordPress Core remains responsible for post data, URL schemes, and escaping; no plugin is required.

## Acceptance

Run `python3 -m unittest tests/test_entry_filter_contract.py` and `php -l tests/fixtures/entry-filter-contract.php.fixture` locally. CI must additionally pass WPCS, WordPress 6.7/latest with PHP 7.4/8.3, Theme Check, browser smoke, and reproducible ZIP on the exact PR SHA before merging. This change introduces no CSS, JS, database queries, or runtime network requests.
