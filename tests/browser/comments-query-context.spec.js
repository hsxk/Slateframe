const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const AxeBuilder = require('@axe-core/playwright').default;

const wp = (...args) => execFileSync('wp', [...args, '--path=/tmp/wp-browser'], {
  encoding: 'utf8', timeout: 30000,
}).trim();

const evidence = {
  'query-only': { mobile: 'comments-query-query-only-390-rtl-400.png', desktop: 'comments-query-query-only-1440-ltr.png', forced: 'comments-query-query-only-390-rtl-400-forced-colors.png' },
  'synced-query-only': { mobile: 'comments-query-synced-query-only-390-rtl-400.png', desktop: 'comments-query-synced-query-only-1440-ltr.png' },
  'query-with-own': { mobile: 'comments-query-query-with-own-390-rtl-400.png', desktop: 'comments-query-query-with-own-1440-ltr.png' },
  'query-with-result': { mobile: 'comments-query-query-with-result-390-rtl-400.png', desktop: 'comments-query-query-with-result-1440-ltr.png' },
};

// WP_Query searches serialized post_content too: using postType=post would
// match the fixture post that stores this search term inside its own block
// attributes. Query pages instead so this is a genuinely empty inner context.
const query = '<!-- wp:query {"query":{"perPage":1,"postType":"page","inherit":false,"search":"slateframe-no-match-query-context-2026"}} -->' +
  '<!-- wp:post-template --><!-- wp:post-comments-form /--><!-- /wp:post-template -->' +
  '<!-- /wp:query -->';
const ownForm = '<!-- wp:post-comments-form /-->';

test('Query Loop discussion never suppresses the current post comments', async ({ page }, info) => {
  test.skip(info.project.use.viewport?.width !== 390, 'One isolated WordPress fixture checks all widths.');
  test.setTimeout(180000);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const postIds = [];
  let patternId = 0;
  try {
    patternId = Number(wp('post', 'create', '--post_type=wp_block', '--post_status=publish',
      '--post_title=Slateframe query context ' + suffix,
      '--post_content=' + query, '--porcelain'));
    expect(patternId).toBeGreaterThan(0);
    // The matching page supplies a real queried-post context. Unlike the
    // empty-query fixtures, this proves its native form can coexist with
    // the outer singular's classic form without stealing ownership.
    const hitTitle = 'slateframe-query-hit-' + suffix;
    const hitPageId = Number(wp('post', 'create', '--post_type=page', '--post_status=publish',
      '--comment_status=open', '--post_title=' + hitTitle, '--porcelain'));
    expect(hitPageId).toBeGreaterThan(0);
    postIds.push(hitPageId);
    const hitQuery = query.replace('slateframe-no-match-query-context-2026', hitTitle);
    const fixtures = [
      { name: 'query-only', content: query, classic: true },
      { name: 'synced-query-only', content: '<!-- wp:block {"ref":' + patternId + '} /-->', classic: true },
      { name: 'query-with-own', content: query + ownForm, classic: false },
      { name: 'query-with-result', content: hitQuery, classic: true, queriedForm: true },
    ];
    for (const fixture of fixtures) {
      const id = Number(wp('post', 'create', '--post_type=post', '--post_status=publish',
        '--comment_status=open', '--post_title=Slateframe ' + fixture.name + ' ' + suffix,
        '--post_content=' + fixture.content, '--porcelain'));
      expect(id).toBeGreaterThan(0);
      postIds.push(id);
      fixture.id = id;
    }
    await fs.mkdir('test-artifacts/screenshots', { recursive: true });
    for (const fixture of fixtures) {
      await page.goto('/?p=' + fixture.id, { waitUntil: 'networkidle' });
      const classic = page.locator('.slateframe-comments');
      // Empty loops must not hide the outer form; the populated loop must
      // retain both forms with distinct WordPress comment target IDs.
      // Core renders the Query's Post Template as a UL; it does not emit a
      // .wp-block-query wrapper. Target the actual repeated-post context.
      await expect(page.locator('.slateframe-prose .wp-block-post-template .wp-block-post-comments-form'))
        .toHaveCount(fixture.queriedForm ? 1 : 0);
      if (fixture.queriedForm) {
        const queried = page.locator('.slateframe-prose .wp-block-post-template .wp-block-post-comments-form');
        await expect(queried.locator('button#submit')).toHaveCount(1);
        await expect(queried.locator('input[name="comment_post_ID"]')).toHaveValue(String(hitPageId));
      }
      await expect(classic).toHaveCount(fixture.classic ? 1 : 0);
      for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const dir of ['ltr', 'rtl']) {
          await page.locator('html').evaluate((root, direction) => {
            root.dir = direction; root.style.fontSize = '16px';
          }, dir);
          expect(await page.evaluate(() => document.documentElement.scrollWidth -
            document.documentElement.clientWidth), fixture.name + ' ' + width + ' ' + dir).toBeLessThanOrEqual(1);
        }
      }
      await page.setViewportSize({ width: 390, height: 900 });
      await page.locator('html').evaluate(root => { root.dir = 'rtl'; root.style.fontSize = '64px'; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth -
        document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      const owner = fixture.classic ? classic : page.locator('.slateframe-prose > .wp-block-post-comments-form');
      // Assert real WordPress comment-form ownership, not just DOM counts.
      // The outer form must submit to the singular post, not the queried page.
      await expect(owner.locator('input[name="comment_post_ID"]')).toHaveValue(String(fixture.id));
      if (fixture.queriedForm) {
        // Retain exact-SHA WordPress evidence even when a11y checks fail.
        await page.screenshot({
          path: 'test-artifacts/screenshots/comments-query-collision-390-rtl-400.png',
          fullPage: true, animations: 'disabled',
        });
        // Both forms are present in the same document. The browser resolves
        // label[for] against document IDs, not the nearest form. A local Axe
        // include can miss a label that points to the *other* form.
        const badLabels = await classic.locator('form').evaluate(form =>
          [...form.querySelectorAll('label[for]')].filter(label => {
            const target = document.getElementById(label.htmlFor);
            return !target || !form.contains(target);
          }).map(label => label.htmlFor));
        expect(badLabels, 'Outer classic labels must target their own controls').toEqual([]);
        const badDescriptions = await classic.locator('form').evaluate(form =>
          [...form.querySelectorAll('[aria-describedby]')].flatMap(control =>
            control.getAttribute('aria-describedby').split(/\\s+/).filter(id => {
              const target = document.getElementById(id);
              return !target || !form.contains(target);
            })));
        expect(badDescriptions, 'Outer descriptions must stay in the classic form').toEqual([]);
        // Core's reply script uses document-global IDs. Detect the remaining
        // collision explicitly; correct labels alone are not sufficient to
        // claim that nested and outer threaded replies can coexist safely.
        const replyIdCollisions = await page.evaluate(() =>
          ['respond', 'reply-title', 'cancel-comment-reply-link', 'commentform', 'comment_parent']
            .filter(id => document.querySelectorAll('[id="' + id + '"]').length > 1));
        expect(replyIdCollisions, 'Core reply containers must not collide across posts').toEqual([]);
        for (const name of ['comment', 'author', 'email', 'url', 'wp-comment-cookies-consent']) {
          const control = classic.locator('[name="' + name + '"]');
          if (await control.count()) {
            await expect(control).toHaveAttribute('id', 'slateframe-outer-' + fixture.id + '-' + name);
          }
        }
      }
      const submit = owner.locator('button[type="submit"]');
      await expect(submit).toHaveCount(1);
      await expect(submit).toHaveAttribute('id', fixture.classic
        ? 'slateframe-outer-' + fixture.id + '-submit' : 'submit');
      expect(await submit.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      const axe = await new AxeBuilder({ page }).include(fixture.classic ? '.slateframe-comments' : '.slateframe-prose > .wp-block-post-comments-form')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(axe.violations).toEqual([]);
      if (fixture.queriedForm) {
        // The nested Core form is an independent interactive region; the
        // outer classic form's Axe pass cannot substitute for its own.
        const queriedAxe = await new AxeBuilder({ page })
          .include('.slateframe-prose .wp-block-post-template .wp-block-post-comments-form')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(queriedAxe.violations).toEqual([]);
        const queriedSubmit = page.locator('.slateframe-prose .wp-block-post-template .wp-block-post-comments-form button#submit');
        await queriedSubmit.focus();
        await expect(queriedSubmit).toBeFocused();
      }
      await page.screenshot({ path: 'test-artifacts/screenshots/' + evidence[fixture.name].mobile, fullPage: true, animations: 'disabled' });
      if (fixture.name === 'query-only') {
        await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
        await page.screenshot({ path: 'test-artifacts/screenshots/' + evidence[fixture.name].forced,
          fullPage: true, animations: 'disabled' });
        await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('html').evaluate(root => { root.dir = 'ltr'; root.style.fontSize = '16px'; });
      await page.screenshot({ path: 'test-artifacts/screenshots/' + evidence[fixture.name].desktop, fullPage: true, animations: 'disabled' });
    }
  } finally {
    for (const id of postIds) wp('post', 'delete', String(id), '--force');
    if (patternId) wp('post', 'delete', String(patternId), '--force');
  }
});
