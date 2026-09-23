<?php
/**
 * Title: Editorial opening
 * Slug: slateframe/editorial-opening
 * Categories: slateframe
 * Keywords: article, editorial, lead, introduction
 * Description: A concise lead and orientation block for long-form articles.
 * Viewport Width: 960
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"className":"slateframe-pattern slateframe-editorial-opening","layout":{"type":"constrained"}} -->
<div class="wp-block-group slateframe-pattern slateframe-editorial-opening">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'In brief', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:paragraph {"className":"is-style-slateframe-lead"} --><p class="is-style-slateframe-lead"><?php echo esc_html_x( 'State the main idea in one or two sentences so readers know what the article will help them understand.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
