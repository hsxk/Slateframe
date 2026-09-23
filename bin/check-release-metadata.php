<?php
/**
 * Validate release metadata without requiring a WordPress bootstrap.
 *
 * This is a standalone CLI development tool. WordPress filesystem and output
 * helpers are intentionally unavailable because WordPress is not loaded.
 *
 * @package Slateframe
 */

// phpcs:disable WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Standalone CLI validator reads local repository files.
// phpcs:disable WordPress.WP.AlternativeFunctions.file_system_operations_fwrite -- Standalone CLI validator writes diagnostics to STDERR.
// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- CLI exceptions are not rendered into HTML.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI status output is not rendered into HTML.

/**
 * Read one header-style metadata value.
 *
 * @param string $contents File contents.
 * @param string $key      Metadata key.
 * @return string
 */
function slateframe_release_field( $contents, $key ) {
	$pattern = '/^' . preg_quote( $key, '/' ) . ':\s*(.+)$/mi';

	if ( ! preg_match( $pattern, $contents, $matches ) ) {
		throw new RuntimeException( sprintf( 'Missing metadata field: %s', $key ) );
	}

	return trim( $matches[1] );
}

/**
 * Validate release metadata files and print a compact status line.
 *
 * @return void
 */
function slateframe_validate_release_metadata() {
	$root = dirname( __DIR__ );

	$style   = file_get_contents( $root . '/style.css' );
	$readme  = file_get_contents( $root . '/readme.txt' );
	$package = json_decode( file_get_contents( $root . '/package.json' ), true, 512, JSON_THROW_ON_ERROR );

	if ( false === $style || false === $readme ) {
		fwrite( STDERR, "Unable to read release metadata files.\n" );
		exit( 1 );
	}

	$style_fields = array(
		'Theme Name'        => slateframe_release_field( $style, 'Theme Name' ),
	'Author'            => slateframe_release_field( $style, 'Author' ),
		'Version'           => slateframe_release_field( $style, 'Version' ),
		'Requires at least' => slateframe_release_field( $style, 'Requires at least' ),
		'Tested up to'      => slateframe_release_field( $style, 'Tested up to' ),
		'Requires PHP'      => slateframe_release_field( $style, 'Requires PHP' ),
		'Text Domain'       => slateframe_release_field( $style, 'Text Domain' ),
		'License URI'       => slateframe_release_field( $style, 'License URI' ),
	);

	$readme_fields = array(
		'Stable tag'        => slateframe_release_field( $readme, 'Stable tag' ),
		'Requires at least' => slateframe_release_field( $readme, 'Requires at least' ),
		'Tested up to'      => slateframe_release_field( $readme, 'Tested up to' ),
		'Requires PHP'      => slateframe_release_field( $readme, 'Requires PHP' ),
		'License URI'       => slateframe_release_field( $readme, 'License URI' ),
	);

	$expected = array(
		'Theme Name'  => 'Slateframe',
		'Text Domain' => 'slateframe',
	);

	foreach ( $expected as $field => $value ) {
		if ( $style_fields[ $field ] !== $value ) {
			throw new RuntimeException( sprintf( '%s must be %s.', $field, $value ) );
		}
	}

	$package_version = (string) ( $package['version'] ?? '' );

	if ( '' === $package_version || $style_fields['Version'] !== $package_version || $readme_fields['Stable tag'] !== $package_version ) {
		throw new RuntimeException( 'Version, Stable tag, and package.json version must match.' );
	}

	foreach ( array( 'Requires at least', 'Tested up to', 'Requires PHP', 'License URI' ) as $field ) {
		if ( $style_fields[ $field ] !== $readme_fields[ $field ] ) {
			throw new RuntimeException( sprintf( '%s must match between style.css and readme.txt.', $field ) );
		}
	}

	printf(
		"Slateframe release metadata OK: version %s, WordPress %s–%s, PHP %s+\n",
		$package_version,
		$style_fields['Requires at least'],
		$style_fields['Tested up to'],
		$style_fields['Requires PHP']
	);
}

slateframe_validate_release_metadata();
