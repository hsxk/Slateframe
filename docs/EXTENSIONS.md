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

## Compatibility policy

Public Slateframe hooks/filters are treated as compatibility surfaces once documented here. Renaming or removing a documented hook should include a deprecation path when practical.

Integrations should rely on public WordPress APIs and documented Slateframe hooks rather than internal DOM structure or private helper implementation.
