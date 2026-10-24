const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], { encoding: 'utf8' }).trim();

test('Core scroll filters only modify native wrapper tags and preserve author tabindex', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One isolated WordPress fixture');
  const data = JSON.parse(wp('eval', `
    $table = '<figure class="wp-block-table"><table></table></figure>';
    $table_author = '<figure class="wp-block-table" tabindex="-1"><table></table></figure>';
    $table_impostor = '<span class="wp-block-table">Not a Core wrapper</span>';
    $calendar = '<div class="wp-block-calendar"><table></table></div>';
    $calendar_author = '<div class="wp-block-calendar" tabindex="-1"><table></table></div>';
    $calendar_impostor = '<span class="wp-block-calendar">Not a Core wrapper</span>';
    echo wp_json_encode( array(
      'table_focus' => false !== strpos( apply_filters( 'render_block_core/table', $table ), 'tabindex="0"' ),
      'table_author' => $table_author === apply_filters( 'render_block_core/table', $table_author ),
      'table_impostor' => $table_impostor === apply_filters( 'render_block_core/table', $table_impostor ),
      'calendar_focus' => false !== strpos( apply_filters( 'render_block_core/calendar', $calendar ), 'tabindex="0"' ),
      'calendar_author' => $calendar_author === apply_filters( 'render_block_core/calendar', $calendar_author ),
      'calendar_impostor' => $calendar_impostor === apply_filters( 'render_block_core/calendar', $calendar_impostor ),
    ) );
  `));
  expect(data).toEqual({
    table_focus: true, table_author: true, table_impostor: true,
    calendar_focus: true, calendar_author: true, calendar_impostor: true,
  });
});
