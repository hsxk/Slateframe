const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

test('capture a neutral WordPress.org preview from real WordPress and Core blocks', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 1440, 'One genuine 1200x900 release preview');
  test.setTimeout(90000);
  const content = await fs.readFile(path.resolve('tests/fixtures/release-preview.html'), 'utf8');
  const id = wp('post', 'create', '--post_type=page', '--post_status=publish',
    '--post_title=Field Notes', '--post_content=' + content, '--porcelain');
  try {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/?page_id=' + id, { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toHaveText('Field Notes');
    await expect(page.locator('.slateframe-prose .wp-block-columns .wp-block-column')).toHaveCount(3);
    const image = page.locator('.slateframe-prose .wp-block-image img');
    await expect(image).toBeVisible();
    expect(await image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
    const bodyText = await page.locator('.slateframe-prose').innerText();
    expect(bodyText).toContain('First light');
    expect(bodyText).not.toMatch(/page.builder|theme features|fast, accessible publishing|lock.in/i);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const dir = path.resolve('test-artifacts/screenshots');
    await fs.mkdir(dir, { recursive: true });
    await page.screenshot({
      path: path.join(dir, 'wordpress-org-screenshot-candidate.png'),
      fullPage: false,
      animations: 'disabled',
    });
  } finally {
    wp('post', 'delete', id, '--force');
  }
});
