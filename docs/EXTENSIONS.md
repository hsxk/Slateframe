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
