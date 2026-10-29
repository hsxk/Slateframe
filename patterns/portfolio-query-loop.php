<?php
/**
 * Title: Portfolio Query Loop
 * Slug: slateframe/portfolio-query-loop
 * Categories: slateframe-portfolio
 * Block Types: core/query
 * Description: A native Query Loop choice with responsive portfolio cards and no custom post types.
 * Keywords: portfolio, projects, query, grid
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:query {"queryId":0,"query":{"perPage":6,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"exclude","inherit":false},"align":"wide","className":"slateframe-project-grid"} -->
<div class="wp-block-query alignwide slateframe-project-grid">
<!-- wp:post-template -->
<!-- wp:group {"className":"slateframe-project-card","layout":{"type":"constrained"}} --><div class="wp-block-group slateframe-project-card"><!-- wp:post-featured-image {"isLink":true,"aspectRatio":"4/3"} /--><!-- wp:post-title {"isLink":true,"fontSize":"lead"} /--><!-- wp:post-excerpt {"moreText":""} /--><!-- wp:post-date /--></div><!-- /wp:group -->
<!-- /wp:post-template -->
<!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"space-between"}} --><!-- wp:query-pagination-previous /--><!-- wp:query-pagination-numbers /--><!-- wp:query-pagination-next /--><!-- /wp:query-pagination -->
<!-- wp:query-no-results --><!-- wp:paragraph --><p><?php echo esc_html_x( 'No projects are available yet.', 'Empty project grid message', 'slateframe' ); ?></p><!-- /wp:paragraph --><!-- /wp:query-no-results -->
</div><!-- /wp:query -->
