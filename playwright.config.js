const { defineConfig } = require('@playwright/test');

const viewports = [
	{ name: 'viewport-320', width: 320, height: 720, touch: true },
	{ name: 'viewport-375', width: 375, height: 812, touch: true },
	{ name: 'viewport-390', width: 390, height: 844, touch: true },
	{ name: 'viewport-412', width: 412, height: 915, touch: true },
	{ name: 'viewport-768', width: 768, height: 1024, touch: true },
	{ name: 'viewport-1440', width: 1440, height: 900, touch: false },
	{ name: 'viewport-1920', width: 1920, height: 1080, touch: false },
];

module.exports = defineConfig({
	testDir: './tests/browser',
	outputDir: 'test-results',
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	fullyParallel: false,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		['list'],
		['html', { outputFolder: 'playwright-report', open: 'never' }],
	],
	use: {
		baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:8080',
		trace: 'retain-on-failure',
	},
	projects: viewports.map((viewport) => ({
		name: viewport.name,
		use: {
			browserName: 'chromium',
			viewport: { width: viewport.width, height: viewport.height },
			hasTouch: viewport.touch,
		},
	})),
});
