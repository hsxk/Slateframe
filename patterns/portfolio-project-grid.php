<?php
/**
 * Title: Project grid
 * Slug: slateframe/portfolio-project-grid
 * Categories: slateframe-portfolio
 * Description: A portable project index built from a native Query Loop with no custom post type assumptions.
 * Keywords: portfolio, projects, query, grid
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-project-grid","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-project-grid">
<!-- wp:group {"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} --><div class="wp-block-group"><!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Selected work', 'Pattern heading', 'slateframe' ); ?></h2><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'A flexible index that stays with your content.', 'Pattern description', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:group -->
<!-- wp:query {"queryId":0,"query":{"perPage":6,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"exclude","inherit":false},"displayLayout":{"type":"flex","columns":3}} -->
<div class="wp-block-query"><!-- wp:post-template -->
<!-- wp:group {"className":"slateframe-project-card","layout":{"type":"constrained"}} --><div class="wp-block-group slateframe-project-card"><!-- wp:post-featured-image {"isLink":true,"aspectRatio":"4/3"} /--><!-- wp:post-title {"isLink":true,"fontSize":"large"} /--><!-- wp:post-excerpt {"moreText":""} /--><!-- wp:post-date /--></div><!-- /wp:group -->
<!-- /wp:post-template -->
<!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"space-between"}} --><!-- wp:query-pagination-previous /--><!-- wp:query-pagination-numbers /--><!-- wp:query-pagination-next /--><!-- /wp:query-pagination -->
<!-- wp:query-no-results --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Publish some work to populate this project grid.', 'Empty project grid message', 'slateframe' ); ?></p><!-- /wp:paragraph --><!-- /wp:query-no-results -->
</div><!-- /wp:query -->
</div><!-- /wp:group -->
