const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('@playwright/test');

const postPath = process.env.SLATEFRAME_POST_PATH || '/';
const pagePath = process.env.SLATEFRAME_PAGE_PATH || '/';
const photoPath = process.env.SLATEFRAME_PHOTO_PATH || pagePath;
const projectPath = process.env.SLATEFRAME_PROJECT_PATH || pagePath;
const knowledgePath = process.env.SLATEFRAME_KNOWLEDGE_PATH || pagePath;
const showcasePath = process.env.SLATEFRAME_SHOWCASE_PATH || pagePath;
const featuredPagePath = process.env.SLATEFRAME_FEATURED_PAGE_PATH || pagePath;
const attachmentPath = process.env.SLATEFRAME_ATTACHMENT_PATH || pagePath;
const untitledPostPath = process.env.SLATEFRAME_UNTITLED_POST_PATH || postPath;

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

	for (const route of ['/', pagePath, postPath, featuredPagePath, attachmentPath, untitledPostPath, photoPath, projectPath, knowledgePath, showcasePath, '/?s=Slateframe']) {
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

	const consentLabel = page.locator('.slateframe-comments .comment-form-cookies-consent label').first();
	await expect(consentLabel).toBeVisible();
	expect((await consentLabel.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);

	await page.locator('.slateframe-prose').first().evaluate((node) => {
		const fixture = document.createElement('div');
		fixture.className = 'browser-core-controls';
		fixture.innerHTML = '<form class="wp-block-search wp-block-search__button-outside"><label class="wp-block-search__label" for="browser-core-search">Search</label><div class="wp-block-search__inside-wrapper"><input id="browser-core-search" class="wp-block-search__input" type="search"><button class="wp-block-search__button wp-element-button" type="submit">Search</button></div></form><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#main-content">Continue</a></div>';
		node.prepend(fixture);
	});
	for (const control of [
		page.locator('#browser-core-search'),
		page.locator('.browser-core-controls .wp-block-search__button'),
		page.locator('.browser-core-controls .wp-block-button__link'),
	]) {
		await expect(control).toBeVisible();
		expect((await control.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	}

	await page.goto(attachmentPath, { waitUntil: 'networkidle' });
	for (const action of await page.locator('.slateframe-action-link').all()) {
		const box = await action.boundingBox();
		expect(box).not.toBeNull();
		expect(box.height).toBeGreaterThanOrEqual(44);
	}

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


test('comment auxiliary actions keep the shared keyboard target', async ({ page }, testInfo) => {
	test.skip(!isRepresentativeWidth(testInfo), 'Comment auxiliary controls are sampled at representative widths.');
	await page.goto(pagePath, { waitUntil: 'networkidle' });
	const comments = page.locator('.slateframe-comments');
	await comments.evaluate((node) => {
		const cancel = node.querySelector('#cancel-comment-reply-link');
		if (cancel) cancel.style.display = '';
		const nav = document.createElement('nav');
		nav.className = 'comment-navigation';
		nav.innerHTML = '<a href="#comments">Older responses</a>';
		node.append(nav);
	});
	const cancel = page.locator('#cancel-comment-reply-link');
	if (await cancel.count()) {
		await expect(cancel).toBeVisible();
		expect((await cancel.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
	}
	const navLink = page.locator('.comment-navigation a').last();
	await expect(navLink).toBeVisible();
	expect((await navLink.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
});
