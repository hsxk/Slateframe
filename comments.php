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
	// A repeated Core Post Template may render a second post's comment form
	// before this classic one. Scope only the classic field references so
	// labels cannot resolve to the earlier queried-post controls. Keep Core
	// form ownership, input names, submission targets and plugin IDs intact.
	$slateframe_query_context = has_block( 'core/query', get_the_ID() ) || has_block( 'core/post-template', get_the_ID() );
	if ( ! $slateframe_query_context ) {
		foreach ( slateframe_singular_synced_pattern_contents() as $slateframe_pattern_content ) {
			if ( is_string( $slateframe_pattern_content ) && ( has_block( 'core/query', $slateframe_pattern_content ) || has_block( 'core/post-template', $slateframe_pattern_content ) ) ) {
				$slateframe_query_context = true;
				break;
			}
		}
	}
	if ( $slateframe_query_context ) {
		add_filter( 'comment_form_defaults', 'slateframe_scope_classic_comment_defaults', 1000 );
		add_filter( 'comment_form_fields', 'slateframe_scope_classic_comment_fields', 1000 );
	}

	// A real button wraps its translated label at extreme text zoom; an input
	// submit control cannot wrap its value and can overflow narrow viewports.
	comment_form(
		array(
			'submit_button' => '<button name="%1$s" type="submit" id="%2$s" class="%3$s" value="%4$s">%4$s</button>',
		)
	);
	if ( $slateframe_query_context ) {
		remove_filter( 'comment_form_defaults', 'slateframe_scope_classic_comment_defaults', 1000 );
		remove_filter( 'comment_form_fields', 'slateframe_scope_classic_comment_fields', 1000 );
		unset( $GLOBALS['slateframe_classic_comment_note_scoped'] );
	}
	?>
</section>
