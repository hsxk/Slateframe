const { test, expect } = require('@playwright/test');

const pagePath = process.env.SLATEFRAME_PAGE_PATH;

test('image-based submit controls keep native form submission semantics', async ({ page }) => {
	test.skip(!pagePath, 'WordPress semantic-form fixture is required.');
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const form = page.locator('.browser-semantic-form');
	const imageSubmit = form.locator('input[type="image"]');
	await expect(imageSubmit).toHaveAttribute('alt', 'Submit image');
	await expect(imageSubmit).toBeVisible();
	await form.locator('input[type="email"]').fill('author@example.test');
	const submission = page.evaluate(() => new Promise((resolve) => {
		const node = document.querySelector('.browser-semantic-form');
		node.addEventListener('submit', (event) => {
			event.preventDefault();
			resolve(event.submitter?.id || '');
		}, { once: true });
	}));
	await imageSubmit.click();
	expect(await submission).toBe('browser-image-submit');
	await expect(form).toBeVisible();
});
