const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

const wp = (php) => execFileSync('wp', ['eval', php, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 20_000,
});
let fixtures;

test.beforeAll(() => {
  test.skip(!process.env.CI, 'Needs the CI WordPress CLI fixture');
  const setup = `
$inner = wp_insert_post(array('post_type'=>'wp_block','post_status'=>'publish',
 'post_title'=>'CI synced inner','post_content'=>'<!-- wp:group {"className":"slateframe-knowledge-checklist"} --><div class="wp-block-group slateframe-knowledge-checklist">Knowledge</div><!-- /wp:group --><!-- wp:group {"className":"slateframe-project-grid"} --><div class="wp-block-group slateframe-project-grid">Portfolio</div><!-- /wp:group --><!-- wp:image {"lightbox":{"enabled":true}} --><figure class="wp-block-image"><img src="/wp-content/themes/slateframe/assets/images/pattern-placeholder-landscape.svg" alt="CI image"></figure><!-- /wp:image -->'));
$outer = wp_insert_post(array('post_type'=>'wp_block','post_status'=>'publish',
 'post_title'=>'CI synced outer','post_content'=>'<!-- wp:block {"ref":'.$inner.'} /-->'));
$page = wp_insert_post(array('post_type'=>'page','post_status'=>'publish',
 'post_title'=>'CI published synced presentation','post_content'=>'<!-- wp:block {"ref":'.$outer.'} /-->'));
$draft = wp_insert_post(array('post_type'=>'wp_block','post_status'=>'draft',
 'post_title'=>'CI draft synced content','post_content'=>'<!-- wp:group {"className":"slateframe-project-grid"} --><div class="wp-block-group slateframe-project-grid">Hidden</div><!-- /wp:group -->'));
$plain = wp_insert_post(array('post_type'=>'page','post_status'=>'publish',
 'post_title'=>'CI unpublished synced reference','post_content'=>'<!-- wp:block {"ref":'.$draft.'} /-->'));
echo json_encode(array($inner,$outer,$page,$draft,$plain));
`;
  fixtures = JSON.parse(wp(setup).trim());
  if (fixtures.length !== 5 || fixtures.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw Error('Failed to create WordPress synced-pattern fixtures');
  }
});

test.afterAll(() => {
  if (fixtures) wp(fixtures.map((id) => `wp_delete_post(${id}, true);`).join('\n'));
});

test('nested published synced presentation loads only required contextual styles', async ({ page }) => {
  await page.goto(`/?page_id=${fixtures[2]}`, { waitUntil: 'networkidle' });
  for (const handle of ['photography', 'content-modes', 'query-loop']) {
    await expect(page.locator(`link[href*="/assets/css/${handle}.css"]`)).toHaveCount(1);
  }
  await expect(page.locator('.slateframe-knowledge-checklist')).toBeVisible();
  await expect(page.locator('.slateframe-project-grid')).toBeVisible();
  await expect(page.locator('figure.wp-block-image img')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('unpublished synced references do not enqueue contextual styles', async ({ page }) => {
  await page.goto(`/?page_id=${fixtures[4]}`, { waitUntil: 'networkidle' });
  for (const handle of ['photography', 'content-modes', 'query-loop']) {
    await expect(page.locator(`link[href*="/assets/css/${handle}.css"]`)).toHaveCount(0);
  }
});
