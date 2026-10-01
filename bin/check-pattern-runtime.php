<?php
/**
 * Validate that every shipped Slateframe block pattern is registered and parseable.
 *
 * This script runs inside a bootstrapped WordPress process via WP-CLI.
 *
 * @package Slateframe
 */

$registry = WP_Block_Patterns_Registry::get_instance();
$files    = glob( get_template_directory() . '/patterns/*.php' );

if ( false === $files || empty( $files ) ) {
	throw new RuntimeException( 'No shipped Slateframe patterns were found.' );
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
		throw new RuntimeException( 'Invalid Slateframe pattern slug in ' . basename( $file ) . ': ' . $slug );
	}

	$filename_slug = 'slateframe/' . basename( $file, '.php' );
	if ( $filename_slug !== $slug ) {
		throw new RuntimeException( 'Pattern filename/slug mismatch: ' . basename( $file ) . ' => ' . $slug );
	}

	if ( isset( $expected[ $slug ] ) ) {
		throw new RuntimeException( 'Duplicate shipped pattern slug: ' . $slug );
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
	throw new RuntimeException( 'Shipped patterns not registered: ' . implode( ', ', array_keys( $missing ) ) );
}

if ( $unexpected ) {
	throw new RuntimeException( 'Registered Slateframe patterns without shipped files: ' . implode( ', ', array_keys( $unexpected ) ) );
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

	if ( '' === trim( $content ) || false === strpos( $content, '<!-- wp:' ) || empty( $named ) ) {
		throw new RuntimeException( 'Pattern is not parseable block content: ' . $name );
	}
}

printf( "Validated %d shipped Slateframe patterns.\n", count( $expected ) );
