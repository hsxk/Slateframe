const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('@playwright/test');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const photoPath = process.env.SLATEFRAME_PHOTO_PATH || pagePath;
const projectPath = process.env.SLATEFRAME_PROJECT_PATH || pagePath;
const knowledgePath = process.env.SLATEFRAME_KNOWLEDGE_PATH || pagePath;
const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || pagePath;

function projectWidth(testInfo) {
	return testInfo.project.use.viewport?.width || 1440;
}

function isRepresentativeWidth(testInfo) {
	return [390, 1440].includes(projectWidth(testInfo));
}

function formatViolations(violations) {
	return violations.map((violation) => ({
		id: violation.id,
		impact: violation.impact,
		help: violation.help,
		targets: violation.nodes.map((node) => node.target),
	}));
}

test('representative routes have no automated WCAG A/AA violations', async ({ page }, testInfo) => {
	test.skip(!isRepresentativeWidth(testInfo), 'Axe runs at representative mobile and desktop widths.');

	for (const route of ['/', pagePath, postPath, photoPath, projectPath, knowledgePath, showcasePath, '/?s=Slateframe']) {
		await page.goto(route, { waitUntil: 'networkidle' });

		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
			.analyze();

		expect(formatViolations(results.violations), `Accessibility violations on ${route}`).toEqual([]);
	}
});

test('keyboard focus remains visibly distinguishable', async ({ page }, testInfo) => {
	test.skip(!isRepresentativeWidth(testInfo), 'Focus styling is sampled at representative widths.');

	await page.goto('/', { waitUntil: 'networkidle' });
	await page.keyboard.press('Tab');

	const focus = await page.locator('.skip-link').evaluate((element) => {
		const styles = getComputedStyle(element);
		return {
			style: styles.outlineStyle,
			width: Number.parseFloat(styles.outlineWidth),
			offset: Number.parseFloat(styles.outlineOffset),
		};
	});

	expect(focus.style).not.toBe('none');
	expect(focus.width).toBeGreaterThanOrEqual(2);
	expect(focus.offset).toBeGreaterThanOrEqual(2);
});

test('primary mobile controls meet the 44px touch-target baseline', async ({ page }, testInfo) => {
	test.skip(projectWidth(testInfo) > 412, 'Touch-target assertions apply to phone-width projects.');

	await page.goto('/', { waitUntil: 'networkidle' });
	const toggle = page.locator('[data-menu-toggle]');
	await expect(toggle).toBeVisible();

	const toggleBox = await toggle.boundingBox();
	expect(toggleBox).not.toBeNull();
	expect(toggleBox.width).toBeGreaterThanOrEqual(44);
	expect(toggleBox.height).toBeGreaterThanOrEqual(44);

	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const summary = page.locator('.browser-details summary');
	const summaryBox = await summary.boundingBox();
	expect(summaryBox).not.toBeNull();
	expect(summaryBox.height).toBeGreaterThanOrEqual(44);

	const submit = page.locator('.slateframe-comments input[type="submit"]').first();
	const submitBox = await submit.boundingBox();
	expect(submitBox).not.toBeNull();
	expect(submitBox.height).toBeGreaterThanOrEqual(44);

	await page.goto(showcasePath, { waitUntil: 'networkidle' });
	const paginationLink = page.locator('.browser-project-grid .wp-block-query-pagination a').first();
	await expect(paginationLink).toBeVisible();
	const paginationBox = await paginationLink.boundingBox();
	expect(paginationBox).not.toBeNull();
	expect(paginationBox.width).toBeGreaterThanOrEqual(44);
	expect(paginationBox.height).toBeGreaterThanOrEqual(44);
});

test('interactive form controls retain accessible names', async ({ page }, testInfo) => {
	test.skip(!isRepresentativeWidth(testInfo), 'Accessible-name checks are sampled at representative widths.');

	await page.goto('/?s=Slateframe', { waitUntil: 'networkidle' });

	await expect(page.getByRole('searchbox')).toHaveAccessibleName('Search for:');
	await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();

	await page.goto(pagePath, { waitUntil: 'networkidle' });
	await expect(page.locator('.slateframe-comments textarea').first()).toHaveAccessibleName(/comment/i);
});
