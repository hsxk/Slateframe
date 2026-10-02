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

## Contextual presentation markers

Slateframe keeps optional presentation out of the base stylesheet and separates Photography from the shared Portfolio/Knowledge layer. Core image or gallery blocks that enable WordPress's native lightbox automatically opt into the Photography layer. New Photography integrations can also append a site-neutral marker:

```php
add_filter(
	'slateframe_photography_markers',
	function ( $markers ) {
		$markers[] = 'is-style-example-photo-sequence';
		return $markers;
	}
);
```

Portfolio/Knowledge integrations can continue to use `slateframe_content_mode_markers`:

```php
add_filter(
	'slateframe_content_mode_markers',
	function ( $markers ) {
		$markers[] = 'is-style-example-learning-panel';
		return $markers;
	}
);
```

For compatibility, markers appended through the older broad `slateframe_content_mode_markers` filter also opt into the Photography layer; existing integrations therefore keep the pre-split broad behavior. New integrations should choose the narrower filter whenever only Photography presentation is needed. Markers are scanned only on singular post content. Use site-neutral class tokens; do not add locale paths, page IDs, plugin routing assumptions, or user data. Both filters must return arrays.

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

Author archives make avatar/profile media opt-in through `slateframe_author_avatar_html`. The default is empty, so a fresh Slateframe site does not acquire a Gravatar or other third-party request merely by opening an author archive.

```php
add_filter(
	'slateframe_author_avatar_html',
	function ( $html, $author_id ) {
		return $html;
	},
	10,
	2
);
```

A site or avatar plugin may return local-media markup here. Slateframe sanitizes it before output and keeps media URLs, user mapping, and storage policy outside theme core.

## Table of contents compatibility

Slateframe provides restrained presentation for Core's Table of Contents block and common `.ez-toc-container` output, including the shared control-height baseline for TOC actions. The theme does not generate TOC structure, rewrite plugin strings, or own SEO/schema behavior.

## Footer content region

Slateframe registers an optional `footer-content` widget area above the compact brand/navigation/copyright row. It accepts Core block widgets and normal WordPress widgets, so sites can build multi-column project links, subscriptions, or multilingual footer content without template overrides or WPCode.

The region is empty by default and emits no wrapper when unused. Content ownership, language visibility, subscription behavior, and external links remain with WordPress/plugins rather than theme runtime.
