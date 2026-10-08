const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const projectPath = process.env.SLATEFRAME_PROJECT_PATH;

test('Portfolio Query Loop uses an existing typography preset with bounded responsive cards', async ({ page }, testInfo) => {
	test.skip(!projectPath, 'WordPress fixture must expose a Portfolio document.');
	const theme = JSON.parse(await fs.readFile(path.resolve('theme.json'), 'utf8'));
	const presets = theme.settings.typography.fontSizes.map((preset) => preset.slug);
	expect(presets).toContain('lead');
	const pattern = await fs.readFile(path.resolve('patterns/portfolio-project-grid.php'), 'utf8');
	expect(pattern).toContain('"fontSize":"lead"');
	expect(pattern).not.toContain('"fontSize":"large"');
	await page.goto(projectPath, { waitUntil: 'networkidle' });
	const grid = page.locator('.slateframe-project-grid').first();
	await expect(grid).toBeVisible();
	const titles = grid.locator('.wp-block-post-title');
	expect(await titles.count()).toBeGreaterThanOrEqual(6);
	const title = titles.first();
	const metrics = await title.evaluate((node) => {
		const probe = document.createElement('span');
		probe.style.fontSize = 'var(--wp--preset--font-size--lead)';
		node.append(probe);
		const expected = Number.parseFloat(getComputedStyle(probe).fontSize);
		probe.remove();
		const style = getComputedStyle(node);
		const rect = node.getBoundingClientRect();
		return {
			className: node.className,
			fontSize: Number.parseFloat(style.fontSize),
			expected,
			lineHeight: Number.parseFloat(style.lineHeight),
			right: rect.right,
			viewport: document.documentElement.clientWidth,
			rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		};
	});
	expect(metrics.className).toContain('has-lead-font-size');
	expect(metrics.fontSize).toBeCloseTo(metrics.expected, 1);
	expect(metrics.lineHeight / metrics.fontSize).toBeLessThanOrEqual(1.3);
	expect(metrics.right).toBeLessThanOrEqual(metrics.viewport + 1);
	expect(metrics.rootOverflow).toBeLessThanOrEqual(1);
	const width = testInfo.project.use.viewport?.width || 1440;
	if ([390, 1440].includes(width)) {
		const screenshots = path.resolve('test-artifacts/screenshots');
		await fs.mkdir(screenshots, { recursive: true });
		await title.screenshot({ path: path.join(screenshots, `portfolio-title-${testInfo.project.name}.png`) });
	}
});
