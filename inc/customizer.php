<?php
/**
 * Appearance controls for Slateframe's spatial system.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Return the bounded design controls that are safe to expose to site owners.
 *
 * @return array
 */
function slateframe_layout_control_definitions() {
	return array(
		'slateframe_control_size'  => array(
			'label'       => __( 'Control size', 'slateframe' ),
			'description' => __( 'Minimum height for buttons, inputs, navigation targets, and pagination.', 'slateframe' ),
			'default'     => 44,
			'min'         => 44,
			'max'         => 56,
			'step'        => 1,
		),
		'slateframe_spacing_scale' => array(
			'label'       => __( 'Spacing density', 'slateframe' ),
			'description' => __( 'Scales component gaps and internal padding without changing text size.', 'slateframe' ),
			'default'     => 1,
			'min'         => 0.9,
			'max'         => 1.2,
			'step'        => 0.05,
		),
		'slateframe_gutter_size'   => array(
			'label'       => __( 'Page gutter', 'slateframe' ),
			'description' => __( 'Controls minimum side whitespace around reading and wide canvases.', 'slateframe' ),
			'default'     => 16,
			'min'         => 14,
			'max'         => 28,
			'step'        => 1,
		),
		'slateframe_section_scale' => array(
			'label'       => __( 'Section whitespace', 'slateframe' ),
			'description' => __( 'Scales vertical separation between major page sections.', 'slateframe' ),
			'default'     => 1,
			'min'         => 0.85,
			'max'         => 1.2,
			'step'        => 0.05,
		),
		'slateframe_radius_size'   => array(
			'label'       => __( 'Corner radius', 'slateframe' ),
			'description' => __( 'Sets the shared radius for controls, panels, media frames, and menus.', 'slateframe' ),
			'default'     => 12,
			'min'         => 0,
			'max'         => 16,
			'step'        => 1,
		),
		'slateframe_content_width' => array(
			'label'       => __( 'Reading width', 'slateframe' ),
			'description' => __( 'Sets the maximum width of long-form reading content.', 'slateframe' ),
			'default'     => 736,
			'min'         => 640,
			'max'         => 800,
			'step'        => 8,
		),
		'slateframe_wide_width'    => array(
			'label'       => __( 'Wide canvas', 'slateframe' ),
			'description' => __( 'Sets the maximum width of wide blocks and editorial grids.', 'slateframe' ),
			'default'     => 1184,
			'min'         => 1024,
			'max'         => 1280,
			'step'        => 16,
		),
	);
}

/**
 * Return a clamped layout setting, including values changed outside Customizer.
 *
 * @param string $id Setting ID.
 * @return float
 */
function slateframe_layout_value( $id ) {
	$controls = slateframe_layout_control_definitions();

	if ( ! isset( $controls[ $id ] ) ) {
		return 0;
	}

	$args  = $controls[ $id ];
	$value = get_theme_mod( $id, $args['default'] );
	$value = is_numeric( $value ) ? (float) $value : (float) $args['default'];

	return min( (float) $args['max'], max( (float) $args['min'], $value ) );
}

/**
 * Sanitize a bounded decimal Customizer value.
 *
 * @param mixed                $value Candidate value.
 * @param WP_Customize_Setting $setting Setting instance.
 * @return float
 */
function slateframe_sanitize_bounded_number( $value, $setting ) {
	$controls = slateframe_layout_control_definitions();
	$args     = isset( $controls[ $setting->id ] ) ? $controls[ $setting->id ] : null;

	if ( ! $args ) {
		return (float) $setting->default;
	}

	$value = is_numeric( $value ) ? (float) $value : (float) $args['default'];

	return min( (float) $args['max'], max( (float) $args['min'], $value ) );
}

/**
 * Format a compact CSS decimal without turning zero into an empty string.
 *
 * @param float $value Numeric value.
 * @return string
 */
function slateframe_format_css_number( $value ) {
	$value = rtrim( rtrim( number_format( (float) $value, 2, '.', '' ), '0' ), '.' );

	return '' === $value ? '0' : $value;
}

/**
 * Register site-wide sizing and spacing controls under Appearance > Customize.
 *
 * @param WP_Customize_Manager $wp_customize Customizer manager.
 */
function slateframe_customize_register( $wp_customize ) {
	$wp_customize->add_section(
		'slateframe_layout',
		array(
			'title'       => __( 'Slateframe layout', 'slateframe' ),
			'description' => __( 'Tune control size, spacing rhythm, reading width, wide canvas, page gutters, section whitespace, and corner radius. Accessible minimums and balanced ranges are preserved.', 'slateframe' ),
			'priority'    => 35,
		)
	);

	foreach ( slateframe_layout_control_definitions() as $id => $args ) {
		$wp_customize->add_setting(
			$id,
			array(
				'default'           => $args['default'],
				'sanitize_callback' => 'slateframe_sanitize_bounded_number',
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			$id,
			array(
				'type'        => 'range',
				'section'     => 'slateframe_layout',
				'label'       => $args['label'],
				'description' => $args['description'],
				'input_attrs' => array(
					'min'  => $args['min'],
					'max'  => $args['max'],
					'step' => $args['step'],
				),
			)
		);
	}
}
add_action( 'customize_register', 'slateframe_customize_register' );

/**
 * Build root-level token overrides for settings that differ from defaults.
 *
 * @return string
 */
function slateframe_customizer_spatial_css() {
	$controls = slateframe_layout_control_definitions();
	$rules    = array();
	$direct   = array(
		'slateframe_control_size'  => array( '--slateframe-control', 'px' ),
		'slateframe_gutter_size'   => array( '--slateframe-gutter-min', 'px' ),
		'slateframe_radius_size'   => array( '--slateframe-radius', 'px' ),
		'slateframe_content_width' => array( '--slateframe-content', 'px' ),
		'slateframe_wide_width'    => array( '--slateframe-wide', 'px' ),
	);

	foreach ( $direct as $id => $token ) {
		$value = slateframe_layout_value( $id );

		if ( abs( $value - (float) $controls[ $id ]['default'] ) > 0.0001 ) {
			$rules[] = $token[0] . ':' . slateframe_format_css_number( $value ) . $token[1];
		}
	}

	$spacing_scale = slateframe_layout_value( 'slateframe_spacing_scale' );

	if ( abs( $spacing_scale - 1 ) > 0.0001 ) {
		$spacing_tokens = array(
			'--slateframe-inline-gap'             => 4,
			'--slateframe-space-2'                => 8,
			'--slateframe-control-padding-block'  => 8,
			'--slateframe-space-3'                => 12,
			'--slateframe-component-gap'          => 12,
			'--slateframe-media-gap'              => 12,
			'--slateframe-control-padding-inline' => 12,
			'--slateframe-caption-gap'            => 10.4,
			'--slateframe-prose-gap'              => 20,
			'--slateframe-heading-gap'            => 36,
			'--slateframe-heading-after'          => 10,
			'--slateframe-list-item-gap'          => 8,
			'--slateframe-space-4'                => 16,
			'--slateframe-stack-gap'              => 16,
		);
		$rules[]        = '--slateframe-space-scale:' . slateframe_format_css_number( $spacing_scale );

		foreach ( $spacing_tokens as $token => $base ) {
			$rules[] = $token . ':' . slateframe_format_css_number( $base * $spacing_scale ) . 'px';
		}
	}

	$section_scale = slateframe_layout_value( 'slateframe_section_scale' );

	if ( abs( $section_scale - 1 ) > 0.0001 ) {
		$rules[] = '--slateframe-section-scale:' . slateframe_format_css_number( $section_scale );
		$rules[] = '--slateframe-section-min:' . slateframe_format_css_number( 44 * $section_scale ) . 'px';
		$rules[] = '--slateframe-section-max:' . slateframe_format_css_number( 72 * $section_scale ) . 'px';
	}

	return $rules ? ':root{' . implode( ';', $rules ) . '}' : '';
}

/**
 * Emit changed spatial tokens only.
 */
function slateframe_customizer_spatial_tokens() {
	$css = slateframe_customizer_spatial_css();

	if ( $css ) {
		wp_add_inline_style( 'slateframe-style', $css );
	}
}
add_action( 'wp_enqueue_scripts', 'slateframe_customizer_spatial_tokens', 20 );
