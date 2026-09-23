<?php
/** Theme bootstrap. @package Slateframe */
if ( ! defined( 'ABSPATH' ) ) { exit; }
function slateframe_setup() {
 load_theme_textdomain( 'slateframe', get_template_directory() . '/languages' );
 add_theme_support( 'title-tag' ); add_theme_support( 'post-thumbnails' ); add_theme_support( 'automatic-feed-links' ); add_theme_support( 'responsive-embeds' ); add_theme_support( 'align-wide' ); add_theme_support( 'wp-block-styles' ); add_theme_support( 'editor-styles' );
 add_editor_style( 'style.css' );
 add_theme_support( 'html5', array( 'search-form','comment-form','comment-list','gallery','caption','style','script' ) );
 add_theme_support( 'custom-logo', array( 'height'=>96,'width'=>96,'flex-height'=>true,'flex-width'=>true ) );
 register_nav_menus( array( 'primary'=>__( 'Primary navigation','slateframe' ), 'footer'=>__( 'Footer navigation','slateframe' ) ) );
}
add_action( 'after_setup_theme', 'slateframe_setup' );
function slateframe_assets() { $v=wp_get_theme()->get( 'Version' ); wp_enqueue_style( 'slateframe-style', get_stylesheet_uri(), array(), $v ); wp_enqueue_script( 'slateframe-theme', get_template_directory_uri().'/assets/js/theme.js', array(), $v, array( 'in_footer'=>true, 'strategy'=>'defer' ) ); }
add_action( 'wp_enqueue_scripts', 'slateframe_assets' );
function slateframe_brand_mark() { if ( has_custom_logo() ) { the_custom_logo(); return; } echo '<span class="slateframe-brand-mark" aria-hidden="true">S</span>'; }
function slateframe_posted_on() { printf( '<time datetime="%1$s">%2$s</time>', esc_attr( get_the_date( DATE_W3C ) ), esc_html( get_the_date() ) ); }
function slateframe_pagination() { the_posts_pagination( array( 'mid_size'=>1, 'prev_text'=>esc_html__( 'Previous','slateframe' ), 'next_text'=>esc_html__( 'Next','slateframe' ), 'screen_reader_text'=>__( 'Posts navigation','slateframe' ) ) ); }
function slateframe_menu_fallback() { wp_page_menu( array( 'menu_class'=>'slateframe-fallback-menu', 'show_home'=>true ) ); }
/** Extension point for multilingual plugins. Return HTML for a language selector, or an empty string. */
function slateframe_language_switcher() { $html=apply_filters( 'slateframe_language_switcher_html', '' ); if ( $html ) { echo wp_kses_post( $html ); } }
function slateframe_register_block_styles() { $styles=array( array('core/quote','slateframe-note',__( 'Editorial note','slateframe' )),array('core/group','slateframe-project-feature',__( 'Project feature','slateframe' )),array('core/group','slateframe-learning-path',__( 'Learning path','slateframe' )),array('core/image','slateframe-frame',__( 'Editorial frame','slateframe' )),array('core/gallery','slateframe-photo-sequence',__( 'Photo sequence','slateframe' )) ); foreach($styles as $s){ register_block_style($s[0],array('name'=>$s[1],'label'=>$s[2])); } }
add_action( 'init','slateframe_register_block_styles' );
function slateframe_pattern_category(){ register_block_pattern_category( 'slateframe', array( 'label'=>__( 'Slateframe','slateframe' ) ) ); }
add_action( 'init','slateframe_pattern_category' );