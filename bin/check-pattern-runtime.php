<?php
/**
 * Validate that every shipped Slateframe block pattern is registered and parseable.
 *
 * This script runs inside a bootstrapped WordPress process via WP-CLI.
 *
 * @package Slateframe
 */


/**
 * Flatten parsed blocks so nested Gallery image slots can be validated.
 *
 * @param array $blocks Parsed blocks.
 * @return array
 */
function slateframe_ci_flatten_blocks( $blocks ) {
	$flat = array();
	foreach ( $blocks as $block ) {
		$flat[] = $block;
		if ( ! empty( $block['innerBlocks'] ) ) {
			$flat = array_merge( $flat, slateframe_ci_flatten_blocks( $block['innerBlocks'] ) );
		}
	}
	return $flat;
}

/**
 * Validate shipped pattern files against the live WordPress registry.
 *
 * @return void
 */
function slateframe_ci_validate_pattern_runtime() {
	$registry = WP_Block_Patterns_Registry::get_instance();
	$files    = glob( get_template_directory() . '/patterns/*.php' );

	if ( false === $files || empty( $files ) ) {
		throw new RuntimeException( esc_html__( 'No shipped Slateframe patterns were found.', 'slateframe' ) );
	}

	$expected = array();

	foreach ( $files as $file ) {
		$headers = get_file_data(
			$file,
			array(
				'slug' => 'Slug',
			)
		);
		$slug    = trim( (string) ( $headers['slug'] ?? '' ) );

		if ( ! preg_match( '#^slateframe/[a-z0-9-]+$#', $slug ) ) {
			throw new RuntimeException(
				sprintf(
					/* translators: 1: pattern file name, 2: declared pattern slug. */
					esc_html__( 'Invalid Slateframe pattern slug in %1$s: %2$s', 'slateframe' ),
					esc_html( basename( $file ) ),
					esc_html( $slug )
				)
			);
		}

		$filename_slug = 'slateframe/' . basename( $file, '.php' );
		if ( $filename_slug !== $slug ) {
			throw new RuntimeException(
				sprintf(
					/* translators: 1: pattern file name, 2: declared pattern slug. */
					esc_html__( 'Pattern filename/slug mismatch: %1$s => %2$s', 'slateframe' ),
					esc_html( basename( $file ) ),
					esc_html( $slug )
				)
			);
		}

		if ( isset( $expected[ $slug ] ) ) {
			throw new RuntimeException(
				sprintf(
					/* translators: %s: duplicate pattern slug. */
					esc_html__( 'Duplicate shipped pattern slug: %s', 'slateframe' ),
					esc_html( $slug )
				)
			);
		}

		$expected[ $slug ] = $file;
	}

	$registered = array();

	foreach ( $registry->get_all_registered() as $pattern ) {
		$name = (string) ( $pattern['name'] ?? '' );
		if ( 0 === strpos( $name, 'slateframe/' ) ) {
			$registered[ $name ] = $pattern;
		}
	}

	$missing    = array_diff_key( $expected, $registered );
	$unexpected = array_diff_key( $registered, $expected );

	if ( $missing ) {
		throw new RuntimeException(
			sprintf(
				/* translators: %s: comma-separated pattern slugs. */
				esc_html__( 'Shipped patterns not registered: %s', 'slateframe' ),
				esc_html( implode( ', ', array_keys( $missing ) ) )
			)
		);
	}

	if ( $unexpected ) {
		throw new RuntimeException(
			sprintf(
				/* translators: %s: comma-separated pattern slugs. */
				esc_html__( 'Registered Slateframe patterns without shipped files: %s', 'slateframe' ),
				esc_html( implode( ', ', array_keys( $unexpected ) ) )
			)
		);
	}

	foreach ( array_keys( $expected ) as $name ) {
		$pattern = $registry->get_registered( $name );
		$content = (string) ( $pattern['content'] ?? '' );
		$blocks  = parse_blocks( $content );
		$named   = array_filter(
			$blocks,
			static function ( $block ) {
				return ! empty( $block['blockName'] );
			}
		);

		$photography_slots = array(
			'slateframe/photography-diptych'       => 2,
			'slateframe/photography-contact-sheet' => 4,
			'slateframe/photo-essay'                => 3,
		);

		if ( isset( $photography_slots[ $name ] ) ) {
			if ( false !== strpos( $content, '\\\\n' ) || false !== strpos( $content, '\\\\t' ) ) {
				throw new RuntimeException( esc_html( sprintf( 'Photography pattern contains escaped whitespace: %s', $name ) ) );
			}
			$flat_blocks = slateframe_ci_flatten_blocks( $blocks );
			$images      = array_values( array_filter( $flat_blocks, static function ( $block ) { return 'core/image' === ( $block['blockName'] ?? '' ); } ) );
			$galleries   = array_values( array_filter( $flat_blocks, static function ( $block ) { return 'core/gallery' === ( $block['blockName'] ?? '' ); } ) );
			if ( 1 !== count( $galleries ) || $photography_slots[ $name ] !== count( $images ) ) {
				throw new RuntimeException( esc_html( sprintf( 'Photography starter slot contract failed: %s', $name ) ) );
			}
			$gallery_attrs = $galleries[0]['attrs'] ?? array();
			if ( false !== ( $gallery_attrs['imageCrop'] ?? null ) || 'none' !== ( $gallery_attrs['linkTo'] ?? '' ) ) {
				throw new RuntimeException( esc_html( sprintf( 'Photography Gallery attributes are unsafe: %s', $name ) ) );
			}
			foreach ( $images as $image ) {
				$attrs = $image['attrs'] ?? array();
				if ( 'large' !== ( $attrs['sizeSlug'] ?? '' ) || 'none' !== ( $attrs['linkDestination'] ?? '' ) || true !== ( $attrs['lightbox']['enabled'] ?? false ) ) {
					throw new RuntimeException( esc_html( sprintf( 'Photography image slot attributes are incomplete: %s', $name ) ) );
				}
			}
		}

		if ( '' === trim( $content ) || false === strpos( $content, '<!-- wp:' ) || empty( $named ) ) {
			throw new RuntimeException(
				sprintf(
					/* translators: %s: pattern slug. */
					esc_html__( 'Pattern is not parseable block content: %s', 'slateframe' ),
					esc_html( $name )
				)
			);
		}
	}

	printf(
		/* translators: %d: number of validated patterns. */
		esc_html__( 'Validated %d shipped Slateframe patterns.', 'slateframe' ) . "\n",
		(int) count( $expected )
	);
}

slateframe_ci_validate_pattern_runtime();
