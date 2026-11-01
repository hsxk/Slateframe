# Readable Core author identity

Slateframe leaves WordPress users, authorship, author archive queries, URLs and native Core Post Author blocks untouched. Only theme-owned classic bylines and archive headings are affected.

- A display name containing only whitespace, HTML entities, combining marks, invisible formatting or filler characters must not create an empty byline anchor or a punctuation-only separator. The published date remains visible.
- An author archive always has a readable H1. For an empty or invisible Core display name it uses the localized `Author` fallback; a readable Core name is retained and escaped in a native `bdi` element.
- A biography containing no readable characters is omitted. Readable multilingual biographies retain Core content and escaping.
- No new CSS, JavaScript, user profile writes, SEO, analytics, remote media or custom author query is introduced.

## Regression evidence

`python3 -m unittest tests.test_entry_byline_bidi tests.test_author_readable_identity tests.test_visual_coverage` and `node --check tests/browser/author-readable-identity.spec.js` cover the executable and static contracts. The browser test owns a disposable WordPress author and published post, cleans both in `finally`, and checks 320/375/390/412/768/1440/1920px in LTR/RTL at 100% and 400%, Axe, keyboard skip-link, forced colors and horizontal overflow.

Exact-HEAD Browser artifacts must contain `author-blank-identity-390-rtl-400-forced-colors.png` and `author-blank-identity-1440-ltr.png`. Their presence is not visual acceptance: inspect both actual PNGs and the wider Appearance, Photography/Lightbox, Portfolio, Knowledge, Search, Forms, Header and Footer samples before merging.
