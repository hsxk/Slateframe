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
 * Sanitize a bounded decimal Customizer value.
 *
 * @param mixed                $value Candidate value.
 * @param WP_Customize_Setting $setting Setting instance.
 * @return float
 */
function slateframe_sanitize_bounded_number( $value, $setting ) {
	$value   = is_numeric( $value ) ? (float) $value : (float) $setting->default;
	$control = $setting->manager->get_control( $setting->id );
	$input   = $control && isset( $control->input_attrs ) ? $control->input_attrs : array();
	$min     = isset( $input['min'] ) ? (float) $input['min'] : $value;
	$max     = isset( $input['max'] ) ? (float) $input['max'] : $value;

	return min( $max, max( $min, $value ) );
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
			'description' => __( 'Tune control size, spacing rhythm, page gutters, section whitespace, and corner radius. Accessible minimums are preserved.', 'slateframe' ),
			'priority'    => 35,
		)
	);

	$controls = array(
		'slateframe_control_size' => array( __( 'Control size', 'slateframe' ), __( 'Minimum height for buttons, inputs, navigation targets, and pagination.', 'slateframe' ), 44, 44, 60, 1 ),
		'slateframe_spacing_scale' => array( __( 'Spacing density', 'slateframe' ), __( 'Scales component gaps and internal padding without changing text size.', 'slateframe' ), 1, 0.85, 1.3, 0.05 ),
		'slateframe_gutter_size' => array( __( 'Page gutter', 'slateframe' ), __( 'Controls minimum side whitespace around reading and wide canvases.', 'slateframe' ), 16, 12, 32, 1 ),
		'slateframe_section_scale' => array( __( 'Section whitespace', 'slateframe' ), __( 'Scales vertical separation between major page sections.', 'slateframe' ), 1, 0.8, 1.35, 0.05 ),
		'slateframe_radius_size' => array( __( 'Corner radius', 'slateframe' ), __( 'Sets the shared radius for controls, panels, media frames, and menus.', 'slateframe' ), 12, 0, 24, 1 ),
	);

	foreach ( $controls as $id => $args ) {
		$wp_customize->add_setting(
			$id,
			array(
				'default'           => $args[2],
				'sanitize_callback' => 'slateframe_sanitize_bounded_number',
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			$id,
			array(
				'type'        => 'range',
				'section'     => 'slateframe_layout',
				'label'       => $args[0],
				'description' => $args[1],
				'input_attrs' => array( 'min' => $args[3], 'max' => $args[4], 'step' => $args[5] ),
			)
		);
	}
}
add_action( 'customize_register', 'slateframe_customize_register' );

/**
 * Emit only changed spatial tokens, keeping defaults free of inline overrides.
 */
function slateframe_customizer_spatial_tokens() {
	$values = array(
		'--slateframe-control'       => array( 'slateframe_control_size', 44, 'px' ),
		'--slateframe-space-scale'   => array( 'slateframe_spacing_scale', 1, '' ),
		'--slateframe-gutter-min'    => array( 'slateframe_gutter_size', 16, 'px' ),
		'--slateframe-section-scale' => array( 'slateframe_section_scale', 1, '' ),
		'--slateframe-radius'        => array( 'slateframe_radius_size', 12, 'px' ),
	);
	$rules = array();

	foreach ( $values as $token => $definition ) {
		$value = (float) get_theme_mod( $definition[0], $definition[1] );
		if ( abs( $value - $definition[1] ) > 0.0001 ) {
			$rules[] = $token . ':' . rtrim( rtrim( number_format( $value, 2, '.', '' ), '0' ), '.' ) . $definition[2];
		}
	}

	if ( $rules ) {
		wp_add_inline_style( 'slateframe-style', ':root{' . implode( ';', $rules ) . '}' );
	}
}
add_action( 'wp_enqueue_scripts', 'slateframe_customizer_spatial_tokens', 20 );
