const { expect } = require('@playwright/test');

/** Settle every lazy Core image before capturing full-page visual evidence. */
async function settleImagesForEvidence(page, selector, minimumCount) {
	const images = page.locator(selector);
	const count = await images.count();
	expect(count).toBeGreaterThanOrEqual(minimumCount);
	for (let index = 0; index < count; index += 1) {
		const image = images.nth(index);
		await image.scrollIntoViewIfNeeded();
		await expect(image).toBeVisible();
		await expect.poll(() => image.evaluate((node) =>
			node.complete && node.naturalWidth > 0 && node.naturalHeight > 0
		)).toBe(true);
		await image.evaluate((node) => node.decode());
	}
	await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
	await expect.poll(() => page.evaluate(() =>
		Math.max(Math.abs(window.scrollX), Math.abs(window.scrollY))
	)).toBeLessThanOrEqual(1);
}

async function settlePortfolioImagesForEvidence(page) {
	await settleImagesForEvidence(page, '.slateframe-project-grid .wp-block-post-featured-image img', 4);
}

async function settlePhotographyImagesForEvidence(page) {
	await settleImagesForEvidence(page, '#main-content .wp-block-image img', 5);
}

async function settleLightboxImageForEvidence(image) {
	await expect(image).toBeVisible();
	await expect.poll(() => image.evaluate((node) =>
		node.complete && node.naturalWidth > 0 && node.naturalHeight > 0
	)).toBe(true);
	await image.evaluate((node) => node.decode());
}

module.exports = { settlePortfolioImagesForEvidence, settlePhotographyImagesForEvidence, settleLightboxImageForEvidence };
