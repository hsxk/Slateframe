<?php
/**
 * Shared empty-state template.
 *
 * @package Slateframe
 */

$slateframe_empty_title   = __( 'Nothing published yet', 'slateframe' );
$slateframe_empty_message = __( 'Published content will appear here. You can also search the site.', 'slateframe' );

if ( is_search() ) {
	$slateframe_empty_title   = __( 'No results', 'slateframe' );
	$slateframe_empty_message = __( 'No published content matched that search. Try another term.', 'slateframe' );
} elseif ( is_author() ) {
	$slateframe_empty_title   = __( 'No published posts', 'slateframe' );
	$slateframe_empty_message = __( 'This author has no published posts yet. Search the site to continue exploring.', 'slateframe' );
} elseif ( is_archive() ) {
	$slateframe_empty_title   = __( 'Nothing in this archive', 'slateframe' );
	$slateframe_empty_message = __( 'There is no published content in this archive yet. Try another archive or search the site.', 'slateframe' );
}
?>
<section class="slateframe-empty-state">
	<h2><?php echo esc_html( $slateframe_empty_title ); ?></h2>
	<p><?php echo esc_html( $slateframe_empty_message ); ?></p>
	<?php if ( ! is_search() ) : ?>
		<?php get_search_form(); ?>
	<?php endif; ?>
</section>
