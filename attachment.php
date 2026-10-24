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
	$slateframe_parent_id     = slateframe_public_attachment_parent_id( $slateframe_attachment_id );
	// Core normally returns strings, but attachment filters can supply invalid
	// values. Do not cast arrays/objects into visible metadata or unsafe links.
	$slateframe_raw_url     = wp_get_attachment_url( $slateframe_attachment_id );
	$slateframe_file_url    = is_string( $slateframe_raw_url ) ? esc_url_raw( $slateframe_raw_url ) : '';
	$slateframe_raw_mime    = get_post_mime_type( $slateframe_attachment_id );
	$slateframe_mime_type   = is_string( $slateframe_raw_mime ) ? $slateframe_raw_mime : '';
	$slateframe_raw_caption = wp_get_attachment_caption( $slateframe_attachment_id );
	$slateframe_caption     = is_string( $slateframe_raw_caption ) ? $slateframe_raw_caption : '';
	$slateframe_details     = slateframe_attachment_details( $slateframe_attachment_id );
	?>
	<main id="main-content" class="slateframe-main" tabindex="-1">
		<article <?php post_class( 'slateframe-entry' ); ?>>
			<header class="slateframe-page-header">
				<div class="slateframe-shell">
					<h1 class="slateframe-entry-title"><?php echo wp_kses_post( slateframe_get_display_title() ); ?></h1>
				</div>
			</header>

			<div class="slateframe-prose">
				<?php if ( wp_attachment_is_image( $slateframe_attachment_id ) ) : ?>
					<?php
					$slateframe_image_html  = wp_get_attachment_image(
						$slateframe_attachment_id,
						'full',
						false,
						array(
							'loading'       => 'eager',
							'decoding'      => 'async',
							'fetchpriority' => 'high',
						)
					);
					$slateframe_image_valid = false;
					if ( is_string( $slateframe_image_html ) && '' !== trim( $slateframe_image_html ) ) {
						// Core image filters can replace already-escaped markup. Sanitize
						// first, then restore only fixed, safe image priority attributes.
						$slateframe_image_html      = wp_kses_post( $slateframe_image_html );
						$slateframe_image_processor = new WP_HTML_Tag_Processor( $slateframe_image_html );
						$slateframe_image_valid     = $slateframe_image_processor->next_tag( 'img' );
						if ( $slateframe_image_valid ) {
							$slateframe_image_processor->set_attribute( 'loading', 'eager' );
							$slateframe_image_processor->set_attribute( 'decoding', 'async' );
							$slateframe_image_processor->set_attribute( 'fetchpriority', 'high' );
							$slateframe_image_html = $slateframe_image_processor->get_updated_html();
						}
					}
					?>
					<?php if ( $slateframe_image_valid ) : ?>
						<figure class="alignwide">
							<?php echo $slateframe_image_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<?php if ( '' !== trim( $slateframe_caption ) ) : ?>
								<figcaption class="wp-caption-text"><?php echo wp_kses_post( $slateframe_caption ); ?></figcaption>
							<?php endif; ?>
						</figure>
					<?php endif; ?>
				<?php elseif ( 0 === strpos( $slateframe_mime_type, 'video/' ) && $slateframe_file_url ) : ?>
					<?php
					$slateframe_video_html = wp_video_shortcode( array( 'src' => $slateframe_file_url ) );
					$slateframe_video_html = is_string( $slateframe_video_html ) ? wp_kses_post( $slateframe_video_html ) : '';
					$slateframe_video_valid = false;
					if ( '' !== trim( $slateframe_video_html ) ) {
						$slateframe_video_processor = new WP_HTML_Tag_Processor( $slateframe_video_html );
						$slateframe_video_valid     = $slateframe_video_processor->next_tag( 'video' );
					}
					if ( $slateframe_video_valid ) :
						?>
						<figure class="alignwide">
							<?php echo $slateframe_video_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<?php if ( '' !== trim( $slateframe_caption ) ) : ?>
								<figcaption class="wp-caption-text"><?php echo wp_kses_post( $slateframe_caption ); ?></figcaption>
							<?php endif; ?>
						</figure>
						<?php
					endif;
					?>
				<?php elseif ( 0 === strpos( $slateframe_mime_type, 'audio/' ) && $slateframe_file_url ) : ?>
					<?php
					$slateframe_audio_html = wp_audio_shortcode( array( 'src' => $slateframe_file_url ) );
					$slateframe_audio_html = is_string( $slateframe_audio_html ) ? wp_kses_post( $slateframe_audio_html ) : '';
					$slateframe_audio_valid = false;
					if ( '' !== trim( $slateframe_audio_html ) ) {
						$slateframe_audio_processor = new WP_HTML_Tag_Processor( $slateframe_audio_html );
						$slateframe_audio_valid     = $slateframe_audio_processor->next_tag( 'audio' );
					}
					if ( $slateframe_audio_valid ) :
						?>
						<figure class="alignwide">
							<?php echo $slateframe_audio_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<?php if ( '' !== trim( $slateframe_caption ) ) : ?>
								<figcaption class="wp-caption-text"><?php echo wp_kses_post( $slateframe_caption ); ?></figcaption>
							<?php endif; ?>
						</figure>
						<?php
					endif;
					?>
				<?php endif; ?>

				<?php
				$slateframe_raw_content = get_the_content();
				if ( is_string( $slateframe_raw_content ) && '' !== trim( $slateframe_raw_content ) ) :
					?>
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
