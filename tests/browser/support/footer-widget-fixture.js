/** Isolate real Core Search footer widgets across parallel Playwright projects. */
const viewports = [320, 375, 390, 412, 768, 1440, 1920];
const widgetContent = '<!-- wp:search {"label":"Search","buttonText":"検索 Search 搜索","buttonPosition":"button-outside"} /-->';

function footerWidgetId(projectName) {
  const index = viewports.indexOf(Number(/^viewport-(\d+)$/.exec(projectName)?.[1]));
  if (index < 0) throw new Error(`Unknown WordPress footer fixture project: ${projectName}`);
  return 908170 + index;
}

function footerWidgetMutation(widgetId, operation) {
  if (!Number.isSafeInteger(widgetId) || widgetId < 1 || !['install', 'remove'].includes(operation)) {
    throw new Error('Invalid disposable WordPress footer widget mutation');
  }
  const install = operation === 'install';
  const encoded = Buffer.from(widgetContent, 'utf8').toString('base64');
  return `
$lock = fopen( sys_get_temp_dir() . '/slateframe-footer-widget-fixture.lock', 'c' );
if ( false === $lock || ! flock( $lock, LOCK_EX ) ) {
    throw new RuntimeException( 'Cannot lock disposable footer widget fixture.' );
}
try {
    // WP-CLI may have primed alloptions before waiting on another worker's lock.
    wp_cache_delete( 'alloptions', 'options' );
    wp_cache_delete( 'widget_block', 'options' );
    wp_cache_delete( 'sidebars_widgets', 'options' );
    $widgets = get_option( 'widget_block', array() );
    $sidebars = wp_get_sidebars_widgets();
    $sidebar = isset( $sidebars['footer-content'] ) ? $sidebars['footer-content'] : array();
    $widget_id = 'block-${widgetId}';
    ${install ? `if ( isset( $widgets[${widgetId}] ) || in_array( $widget_id, $sidebar, true ) ) {
        throw new RuntimeException( 'Disposable footer widget fixture ID already exists.' );
    }
    $widgets[${widgetId}] = array( 'content' => base64_decode( '${encoded}', true ) );
    $sidebar[] = $widget_id;` : `unset( $widgets[${widgetId}] );
    $sidebar = array_values( array_diff( $sidebar, array( $widget_id ) ) );`}
    $sidebars['footer-content'] = $sidebar;
    update_option( 'widget_block', $widgets );
    wp_set_sidebars_widgets( $sidebars );
} finally {
    flock( $lock, LOCK_UN );
    fclose( $lock );
}
`;
}

module.exports = { footerWidgetId, footerWidgetMutation };
