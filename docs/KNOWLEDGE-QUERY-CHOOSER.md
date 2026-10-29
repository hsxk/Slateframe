# Native Knowledge Query Loop chooser

The **Knowledge article Query Loop** pattern is a portable `core/query` root with `Block Types: core/query`. It appears in WordPress's native Query Loop chooser and Replace flow, rather than requiring a theme-specific widget or custom post type.

It renders six recent posts using Core Post Template, Post Title, Post Date, Post Excerpt, Query Pagination and Query No Results. Authors can use Gutenberg to change the query, filters, ordering and blocks. The example content is generic and the empty state is translatable.

Unlike the Portfolio Query Loop's image-led cards, this is a one-column, typography-led article index. It deliberately uses existing Core presentation without additional runtime CSS or JavaScript, theme-owned taxonomy, SEO or data storage.

Acceptance: the WordPress/Chromium browser suite checks the registered chooser metadata, a real published matching post, focus, CJK/RTL/long identifiers, 320/375/390/412/768/1440/1920px at 16/32/64px root text, Axe, forced colors and two exact-HEAD screenshots. CI success and actual visual inspection are required before merging.
