const { test, expect } = require('@playwright/test');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const projectWidth = (testInfo) => testInfo.project.use.viewport?.width || 1440;

async function expectMetaGroupContained(page) {
	const result = await page.locator('.slateframe-entry-meta').evaluate((meta) => {
		const group = meta.querySelector('.slateframe-meta-byline');
		const separator = group?.querySelector('.slateframe-meta-separator');
		const byline = group?.querySelector('.slateframe-byline');
		if (!group || !separator || !byline) return null;
		const groupBox = group.getBoundingClientRect();
		const sepBox = separator.getBoundingClientRect();
		const bylineBox = byline.getBoundingClientRect();
		return {
			groupLeft: groupBox.left,
			groupRight: groupBox.right,
			viewport: document.documentElement.clientWidth,
			separatorCenter: (sepBox.top + sepBox.bottom) / 2,
			bylineCenter: (bylineBox.top + bylineBox.bottom) / 2,
			separatorHidden: separator.getAttribute('aria-hidden'),
			groupContains: group.contains(separator) && group.contains(byline),
		};
	});
	expect(result, 'post fixture should expose author metadata').not.toBeNull();
	expect(result.groupContains).toBe(true);
	expect(result.separatorHidden).toBe('true');
	expect(result.groupLeft).toBeGreaterThanOrEqual(-1);
	expect(result.groupRight).toBeLessThanOrEqual(result.viewport + 1);
	expect(Math.abs(result.separatorCenter - result.bylineCenter)).toBeLessThanOrEqual(2);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	expect(overflow, 'entry metadata must not cause document overflow').toBeLessThanOrEqual(1);
}

test('post date separator and author form one responsive wrapping unit', async ({ page }, testInfo) => {
	await page.goto(postPath, { waitUntil: 'networkidle' });
	await expect(page.locator('.slateframe-entry-meta .slateframe-meta-byline')).toHaveCount(1);
	await expectMetaGroupContained(page);

	const author = page.locator('.slateframe-meta-byline .slateframe-byline a');
	await expect(author).toHaveCount(1);
	await author.evaluate((node) => { node.textContent = '非常长的作者名称 مع اسم عربي طويل طويل للغاية — LongUnbrokenAuthorNameWithoutWhitespace'; });
	await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
	await expectMetaGroupContained(page);

	await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
	await expectMetaGroupContained(page);
	if ([390, 1440].includes(projectWidth(testInfo))) {
		await testInfo.attach('entry-meta-long-rtl', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
	}
});
