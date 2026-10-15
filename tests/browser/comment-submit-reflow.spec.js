const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const postPath = process.env.SLATEFRAME_MULTIPAGE_POST_PATH;
const viewport = (info) => info.project.use.viewport?.width || 0;

test('native comment submit label reflows at 400% in both directions without clipping', async ({ page }, info) => {
	test.skip(!postPath, 'Requires the real WordPress multipage post fixture.');
	await page.emulateMedia({ forcedColors: 'active' });
	await page.goto(postPath, { waitUntil: 'networkidle' });
	const form = page.locator('#respond form.comment-form');
	const submit = form.locator('button#submit[name="submit"][type="submit"]');
	await expect(submit).toHaveCount(1);
	await expect(submit).toHaveText(/\S/);
	await expect(submit).toHaveAttribute('value', /\S/);
	expect((await submit.getAttribute('value')).trim()).toBe((await submit.innerText()).trim());
	const postedValue = await submit.evaluate((button) => new FormData(button.form, button).get(button.name));
	expect(postedValue).toBe((await submit.innerText()).trim());
	await expect(form.locator('input[type="submit"]')).toHaveCount(0);
	for (const dir of ['ltr', 'rtl']) {
		await page.locator('html').evaluate((element, direction) => {
			element.dir = direction;
			element.style.fontSize = '400%';
		}, dir);
		await page.evaluate(async () => {
			await document.fonts.ready;
			await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		});
		await submit.focus();
		await expect(submit).toBeFocused();
		const result = await submit.evaluate((element) => {
			const box = element.getBoundingClientRect();
			const root = document.documentElement;
			return {
				pageOverflow: root.scrollWidth - root.clientWidth,
				viewport: root.clientWidth,
				width: box.width,
				height: box.height,
				textOverflow: element.scrollWidth - element.clientWidth,
				verticalOverflow: element.scrollHeight - element.clientHeight,
				outlineStyle: getComputedStyle(element).outlineStyle,
			};
		});
		expect(result.pageOverflow, `${viewport(info)}px ${dir}: ${JSON.stringify(result)}`).toBeLessThanOrEqual(1);
		expect(result.width).toBeGreaterThanOrEqual(44);
		expect(result.width).toBeLessThanOrEqual(result.viewport + 1);
		expect(result.height).toBeGreaterThanOrEqual(44);
		expect(result.textOverflow).toBeLessThanOrEqual(1);
		expect(result.verticalOverflow).toBeLessThanOrEqual(1);
		expect(result.outlineStyle).not.toBe('none');
		if ([320, 390, 1440].includes(viewport(info))) {
			const folder = path.resolve('test-artifacts/screenshots');
			await fs.mkdir(folder, { recursive: true });
			await page.screenshot({
				path: path.join(folder, `comment-submit-${dir}-400-forced-colors-${viewport(info)}.png`),
				fullPage: true,
			});
		}
	}
});
