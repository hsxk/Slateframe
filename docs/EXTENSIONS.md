# Public extension points

Slateframe keeps optional integrations outside core assumptions.

## Language switcher

```php
add_filter(
	'slateframe_language_switcher_html',
	function () {
		return '<nav aria-label="' . esc_attr__( 'Languages', 'your-text-domain' ) . '">…</nav>';
	}
);
```

The filter must return safe HTML. Slateframe sanitizes the returned markup with `wp_kses_post()` before rendering it inside the navigation language slot.

Core does not infer languages, construct translated URLs, or emit a fixed locale list.

## Contextual content-mode markers

Slateframe keeps Photography, Portfolio, and Knowledge presentation out of the base stylesheet. Integrations that reuse those visual modes may append a stable class or block-style marker:

```php
add_filter(
	'slateframe_content_mode_markers',
	function ( $markers ) {
		$markers[] = 'is-style-example-learning-panel';
		return $markers;
	}
);
```

Markers are scanned only on singular post content to decide whether the contextual stylesheet is needed. Use a site-neutral class token; do not add locale paths, page IDs, plugin-specific routing assumptions, or user data. The filter must return an array.

## Compatibility policy

Public Slateframe hooks/filters are treated as compatibility surfaces once documented here. Renaming or removing a documented hook should include a deprecation path when practical.

Integrations should rely on public WordPress APIs and documented Slateframe hooks rather than internal DOM structure or private helper implementation.


## Author destinations

Slateframe uses normal WordPress author archives by default. A site that has an editorial About/Profile page may change only the theme byline destination without rewriting WordPress author URLs globally:

```php
add_filter(
	'slateframe_author_url',
	function ( $url, $author_id ) {
		return $url;
	},
	10,
	2
);
```

Do not hard-code user IDs or translated page IDs in the theme itself.

## Related reading

Single posts include a small related-reading surface. Slateframe prefers shared tags, falls back to categories, and finally recent posts. The query remains filterable so multilingual or editorial-relevance plugins can constrain it without a required dependency:

```php
add_filter(
	'slateframe_related_posts_args',
	function ( $args, $post_id ) {
		return $args;
	},
	10,
	2
);
```

Return `false` from `slateframe_show_related_posts` to disable the built-in presentation when a plugin owns related content.

## Taxonomy presentation

`slateframe_entry_categories_html` and `slateframe_entry_tags_html` allow a site or plugin to refine the taxonomy links shown in a single-entry footer. Slateframe does not hide terms based on fixed IDs, slugs, or language assumptions.

## 404 recovery content

`slateframe_not_found_posts_args` filters the small recent-post query shown on the native 404 template. Use it to apply editorial or language context while keeping the 404 template site-neutral.


## Post navigation

Slateframe keeps native previous/next navigation enabled by default. Integrations may suppress it when a site supplies a different reading flow:

```php
add_filter(
	'slateframe_show_post_navigation',
	function ( $show, $post_id ) {
		return $show;
	},
	10,
	2
);
```

The default remains portable and requires no Astra-specific hook.

## Avatar compatibility

Author archives render avatars through WordPress core `get_avatar()`. Sites may therefore use any standards-compatible avatar plugin or the normal `get_avatar_url` filter without Slateframe owning local-media paths or user IDs.

## Table of contents compatibility

Slateframe provides restrained presentation for Core's Table of Contents block and common `.ez-toc-container` output, including the shared control-height baseline for TOC actions. The theme does not generate TOC structure, rewrite plugin strings, or own SEO/schema behavior.
