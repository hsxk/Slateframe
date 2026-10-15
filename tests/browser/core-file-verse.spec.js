const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

async function openArticle(page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  const post = page.locator('.slateframe-card-title a').first();
  await expect(post).toBeVisible();
  await post.click();
  await expect(page.locator('.slateframe-prose').first()).toBeVisible();
  // The CI WordPress locale is LTR; explicitly load the actual RTL stylesheet.
  await page.addStyleTag({ path: 'rtl.css' });
}

async function addFixtures(page) {
  await page.locator('.slateframe-prose').first().evaluate(root => {
    const section = document.createElement('section');
    section.className = 'slateframe-core-file-verse-fixture';
    const file = document.createElement('div');
    file.className = 'wp-block-file';
    const filename = document.createElement('a');
    filename.href = '#native-file';
    filename.textContent = '日本語のファイル名-中文资料-العربية-' + 'long-documentation-'.repeat(10) + '.pdf';
    const download = document.createElement('a');
    download.href = '#native-file';
    download.className = 'wp-block-file__button wp-element-button';
    download.textContent = 'Download / 下载 / ダウンロード / تنزيل';
    download.setAttribute('download', 'reference.pdf');
    file.append(filename, document.createTextNode(' '), download);
    const verse = document.createElement('pre');
    verse.className = 'wp-block-verse';
    verse.textContent = 'قصيدة عربية\n    السطر الثاني\n' + '日本語中文'.repeat(40);
    const code = document.createElement('pre');
    code.className = 'wp-block-code';
    const codeText = document.createElement('code');
    codeText.textContent = 'const reference = "' + 'long-token-'.repeat(120) + '";';
    code.append(codeText);
    section.append(file, verse, code);
    root.append(section);
  });
}

async function metrics(page) {
  return page.locator('.slateframe-core-file-verse-fixture').evaluate(root => {
    const filename = root.querySelector('.wp-block-file > a:first-child');
    const download = root.querySelector('.wp-block-file__button');
    const verse = root.querySelector('.wp-block-verse');
    const code = root.querySelector('.wp-block-code');
    const a = filename.getBoundingClientRect();
    const b = download.getBoundingClientRect();
    return {
      filename: { width: a.width, height: a.height },
      download: { width: b.width, height: b.height, minHeight: parseFloat(getComputedStyle(download).minHeight) },
      verseDirection: getComputedStyle(verse).direction,
      codeDirection: getComputedStyle(code).direction,
      verseWrap: getComputedStyle(verse).whiteSpace,
      verseOverflowWrap: getComputedStyle(verse).overflowWrap,
      codeScroll: code.scrollWidth,
      codeClient: code.clientWidth,
      codeOverflow: getComputedStyle(code).overflowX,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

test('native Core File and Verse preserve geometry and writing direction at seven widths', async ({ page }) => {
  await openArticle(page);
  await addFixtures(page);
  const file = page.locator('.slateframe-core-file-verse-fixture .wp-block-file');
  await expect(file.locator('a')).toHaveCount(2);
  await expect(file.locator('a').first()).toHaveAttribute('href', '#native-file');
  await expect(file.locator('.wp-block-file__button')).toHaveAttribute('download', 'reference.pdf');
  for (const width of [320, 375, 390, 412, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(value => { document.documentElement.dir = value; }, dir);
      const m = await metrics(page);
      expect(m.filename.height, width + 'px ' + dir).toBeGreaterThanOrEqual(43);
      expect(m.filename.width).toBeGreaterThanOrEqual(43);
      expect(m.download.minHeight, width + 'px ' + dir).toBeGreaterThanOrEqual(44);
      expect(m.download.height, width + 'px ' + dir).toBeGreaterThanOrEqual(44);
      expect(m.download.width).toBeGreaterThanOrEqual(43);
      expect(m.verseDirection).toBe(dir);
      expect(m.codeDirection).toBe('ltr');
      expect(m.verseWrap).toBe('pre-wrap');
      expect(m.verseOverflowWrap).toBe('anywhere');
      expect(m.codeOverflow).toBe('auto');
      expect(m.codeScroll).toBeGreaterThan(m.codeClient);
      expect(m.documentOverflow, width + 'px ' + dir).toBeLessThanOrEqual(1);
    }
  }
});

test('Core File keyboard focus remains visible in forced colors and 200% text zoom', async ({ page }) => {
  await openArticle(page);
  await addFixtures(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.style.fontSize = '200%';
  });
  await page.emulateMedia({ forcedColors: 'active' });
  const links = page.locator('.slateframe-core-file-verse-fixture .wp-block-file > a');
  await expect(links).toHaveCount(2);
  await page.keyboard.press('Tab'); // Set keyboard modality before programmatic focus.
  for (const link of await links.all()) {
    await link.focus();
    await expect(link).toBeFocused();
    const focus = await link.evaluate(node => ({
      visible: node.matches(':focus-visible'),
      outline: getComputedStyle(node).outlineStyle,
      width: parseFloat(getComputedStyle(node).outlineWidth),
    }));
    expect(focus.visible).toBe(true);
    expect(focus.outline).not.toBe('none');
    expect(focus.width).toBeGreaterThanOrEqual(2);
  }
  const m = await metrics(page);
  expect(m.verseDirection).toBe('rtl');
  expect(m.codeDirection).toBe('ltr');
  expect(m.documentOverflow).toBeLessThanOrEqual(1);
  await fs.mkdir('test-artifacts/screenshots', { recursive: true });
  await page.locator('.slateframe-core-file-verse-fixture').screenshot({
    path: 'test-artifacts/screenshots/core-file-verse-390-rtl-200-forced-colors.png',
  });
});
