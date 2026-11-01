<?php
/**
 * Comments template.
 *
 * @package Slateframe
 */

if ( post_password_required() ) {
	return;
}

$slateframe_comment_count = get_comments_number();
// Only a rendered second Core form requires scoped classic reply markup.
$slateframe_parallel_form = isset( $GLOBALS['slateframe_nested_core_comment_form_rendered'] ) && absint( $GLOBALS['slateframe_nested_core_comment_form_rendered'] ) === absint( get_the_ID() );
?>
<section id="comments" class="slateframe-prose slateframe-comments">
	<?php if ( have_comments() ) : ?>
		<h2 class="slateframe-comments-title">
			<?php
			printf(
				esc_html(
					/* translators: %s: number of comments. */
					_n(
						'%s response',
						'%s responses',
						$slateframe_comment_count,
						'slateframe'
					)
				),
				'<bdi>' . esc_html( number_format_i18n( $slateframe_comment_count ) ) . '</bdi>'
			);
			?>
		</h2>

		<ol class="slateframe-comment-list">
			<?php
			if ( $slateframe_parallel_form ) {
				add_filter( 'comment_reply_link', 'slateframe_scope_outer_comment_reply_link', 1000, 4 );
			}
			wp_list_comments(
				array(
					'style'       => 'ol',
					'short_ping'  => true,
					'avatar_size' => 48,
				)
			);
			if ( $slateframe_parallel_form ) {
				remove_filter( 'comment_reply_link', 'slateframe_scope_outer_comment_reply_link', 1000 );
			}
			?>
		</ol>

		<?php the_comments_navigation(); ?>
	<?php endif; ?>

	<?php if ( ! comments_open() && $slateframe_comment_count ) : ?>
		<p><?php esc_html_e( 'Comments are closed.', 'slateframe' ); ?></p>
	<?php endif; ?>

	<?php
	if ( $slateframe_parallel_form ) {
		add_filter( 'comment_form_defaults', 'slateframe_scope_classic_comment_defaults', 1000 );
		add_filter( 'comment_form_fields', 'slateframe_scope_classic_comment_fields', 1000 );
		ob_start();
	}

	// A real button wraps its translated label at extreme text zoom; an input
	// submit control cannot wrap its value and can overflow narrow viewports.
	comment_form(
		array(
			'submit_button' => '<button name="%1$s" type="submit" id="%2$s" class="%3$s" value="%4$s">%4$s</button>',
		)
	);
	if ( $slateframe_parallel_form ) {
		$slateframe_classic_html = ob_get_clean();
		remove_filter( 'comment_form_defaults', 'slateframe_scope_classic_comment_defaults', 1000 );
		remove_filter( 'comment_form_fields', 'slateframe_scope_classic_comment_fields', 1000 );
		unset( $GLOBALS['slateframe_classic_comment_note_scoped'] );
		echo slateframe_scope_outer_comment_form_html( $slateframe_classic_html, get_the_ID() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core comment_form() HTML with only canonical IDs scoped.
	}
	?>
</section>
