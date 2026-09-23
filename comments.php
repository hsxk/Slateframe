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
			/* translators: %s: number of comments. */
			printf(
				esc_html(
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

	<?php comment_form(); ?>
</section>
