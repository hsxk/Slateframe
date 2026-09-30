<?php
/**
 * Attachment template.
 *
 * @package Slateframe
 */

get_header();

while ( have_posts() ) :
	the_post();

	$slateframe_attachment_id = get_the_ID();
	$slateframe_parent_id     = wp_get_post_parent_id( $slateframe_attachment_id );
	$slateframe_file_url      = wp_get_attachment_url( $slateframe_attachment_id );
	$slateframe_mime_type     = (string) get_post_mime_type( $slateframe_attachment_id );
	$slateframe_caption       = wp_get_attachment_caption( $slateframe_attachment_id );
	$slateframe_details       = slateframe_attachment_details( $slateframe_attachment_id );
	?>
	<main id="main-content" class="slateframe-main">
		<article <?php post_class( 'slateframe-entry' ); ?>>
			<header class="slateframe-page-header">
				<div class="slateframe-shell">
					<h1 class="slateframe-entry-title"><?php echo wp_kses_post( slateframe_get_display_title() ); ?></h1>
				</div>
			</header>

			<div class="slateframe-prose">
				<?php if ( wp_attachment_is_image( $slateframe_attachment_id ) ) : ?>
					<figure class="alignwide">
						<?php
						echo wp_kses_post(
							wp_get_attachment_image(
								$slateframe_attachment_id,
								'full',
								false,
								array(
									'loading'       => 'eager',
									'decoding'      => 'async',
									'fetchpriority' => 'high',
								)
							)
						);
						?>
						<?php if ( '' !== trim( (string) $slateframe_caption ) ) : ?>
							<figcaption class="wp-caption-text"><?php echo wp_kses_post( $slateframe_caption ); ?></figcaption>
						<?php endif; ?>
					</figure>
				<?php elseif ( 0 === strpos( $slateframe_mime_type, 'video/' ) && $slateframe_file_url ) : ?>
					<?php echo wp_kses_post( wp_video_shortcode( array( 'src' => $slateframe_file_url ) ) ); ?>
				<?php elseif ( 0 === strpos( $slateframe_mime_type, 'audio/' ) && $slateframe_file_url ) : ?>
					<?php echo wp_kses_post( wp_audio_shortcode( array( 'src' => $slateframe_file_url ) ) ); ?>
				<?php endif; ?>

				<?php if ( '' !== trim( (string) get_the_content() ) ) : ?>
					<?php the_content(); ?>
				<?php endif; ?>
			</div>

			<div class="slateframe-shell slateframe-entry-context">
				<?php if ( $slateframe_details ) : ?>
					<section class="slateframe-entry-footer" aria-label="<?php esc_attr_e( 'Media details', 'slateframe' ); ?>">
						<?php foreach ( $slateframe_details as $slateframe_label => $slateframe_value ) : ?>
							<div><span class="slateframe-entry-footer-label"><?php echo esc_html( $slateframe_label ); ?></span> <?php echo esc_html( $slateframe_value ); ?></div>
						<?php endforeach; ?>
					</section>
				<?php endif; ?>

				<div class="slateframe-not-found-actions">
					<?php if ( $slateframe_file_url ) : ?>
						<a class="slateframe-action-link" href="<?php echo esc_url( $slateframe_file_url ); ?>"><?php esc_html_e( 'Open original file', 'slateframe' ); ?></a>
					<?php endif; ?>
					<?php if ( $slateframe_parent_id ) : ?>
						<a class="slateframe-action-link" href="<?php echo esc_url( get_permalink( $slateframe_parent_id ) ); ?>">
							<?php
							printf(
								/* translators: %s: parent post or Page title. */
								esc_html__( 'Back to %s', 'slateframe' ),
								esc_html( slateframe_get_display_title( $slateframe_parent_id ) )
							);
							?>
						</a>
					<?php endif; ?>
				</div>
			</div>
		</article>

		<?php
		if ( comments_open() || get_comments_number() ) {
			comments_template();
		}
		?>
	</main>
	<?php
endwhile;

get_footer();
