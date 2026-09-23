const { defineConfig } = require('@playwright/test');

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
	projects: [
		{
			name: 'desktop-chromium',
			use: {
				browserName: 'chromium',
				viewport: { width: 1440, height: 900 },
			},
		},
		{
			name: 'mobile-chromium',
			use: {
				browserName: 'chromium',
				viewport: { width: 390, height: 844 },
				isMobile: true,
				hasTouch: true,
			},
		},
	],
});
