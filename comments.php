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
				esc_html( number_format_i18n( $slateframe_comment_count ) )
			);
			?>
		</h2>

		<ol class="slateframe-comment-list">
			<?php
			wp_list_comments(
				array(
					'style'       => 'ol',
					'short_ping'  => true,
					'avatar_size' => 48,
				)
			);
			?>
		</ol>

		<?php the_comments_navigation(); ?>
	<?php endif; ?>

	<?php if ( ! comments_open() && $slateframe_comment_count ) : ?>
		<p><?php esc_html_e( 'Comments are closed.', 'slateframe' ); ?></p>
	<?php endif; ?>

	<?php
	// A real button wraps its translated label at extreme text zoom; an input
	// submit control cannot wrap its value and can overflow narrow viewports.
	comment_form(
		array(
			'submit_button' => '<button name="%1$s" type="submit" id="%2$s" class="%3$s">%4$s</button>',
		)
	);
	?>
</section>
