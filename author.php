<?php
/**
 * Author archive template.
 *
 * @package Slateframe
 */

get_header();

$slateframe_author_id  = get_queried_object_id();
$slateframe_author_bio = get_the_author_meta( 'description', $slateframe_author_id );

/**
 * Filters optional avatar/profile media rendered by the author archive.
 *
 * Empty by default so Slateframe does not introduce a third-party avatar
 * request. Sites may provide local media or a plugin-owned avatar here.
 *
 * @param string $avatar_html Avatar/profile media HTML.
 * @param int    $author_id   WordPress user ID.
 */
$slateframe_author_avatar = apply_filters( 'slateframe_author_avatar_html', '', $slateframe_author_id );
?>
<main id="main-content" class="slateframe-main">
	<header class="slateframe-page-header">
		<div class="slateframe-shell slateframe-author-header">
			<?php if ( $slateframe_author_avatar ) : ?>
				<div class="slateframe-author-avatar"><?php echo wp_kses_post( $slateframe_author_avatar ); ?></div>
			<?php endif; ?>
			<div class="slateframe-author-copy">
			<h1 class="slateframe-page-title"><?php echo esc_html( get_the_author_meta( 'display_name', $slateframe_author_id ) ); ?></h1>
			<?php if ( $slateframe_author_bio ) : ?>
				<p class="slateframe-archive-description"><?php echo esc_html( $slateframe_author_bio ); ?></p>
			<?php endif; ?>
			</div>
		</div>
	</header>

	<div class="slateframe-shell slateframe-grid">
		<?php
		while ( have_posts() ) :
			the_post();
			get_template_part( 'template-parts/content', 'card' );
		endwhile;
		?>
	</div>

	<div class="slateframe-shell slateframe-pagination">
		<?php slateframe_pagination(); ?>
	</div>
</main>
<?php
get_footer();
