const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const expect = (value) => ({
	toBeGreaterThanOrEqual: (minimum) => assert.ok(value >= minimum),
	toBeVisible: async () => assert.notEqual(value.visible, false),
});
expect.poll = (getter) => ({
	toBe: async (target) => assert.equal(await getter(), target),
	toBeLessThanOrEqual: async (maximum) => assert.ok((await getter()) <= maximum),
});
const context = { module: { exports: {} }, require: (id) => {
	assert.equal(id, '@playwright/test');
	return { expect };
} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'visual-evidence.js'), 'utf8'), context);
const { settleImagesForEvidence, settlePortfolioImagesForEvidence, settlePhotographyImagesForEvidence, settleLightboxImageForEvidence } = context.module.exports;

function fixture(count, options = {}) {
	const log = [];
	const nodes = Array.from({ length: count }, (_, i) => ({
		complete: true,
		naturalWidth: options.brokenAt === i ? 0 : 160,
		naturalHeight: options.zeroHeightAt === i ? 0 : 120,
		decode: async () => { log.push('decode'); if (options.decodeFailsAt === i) throw Error('decode failed'); },
	}));
	const page = {
		locator: () => ({
			count: async () => nodes.length,
			nth: (i) => ({
				visible: options.hiddenAt !== i,
				scrollIntoViewIfNeeded: async () => log.push('scroll'),
				evaluate: async (fn) => fn(nodes[i]),
			}),
		}),
		evaluate: async (fn) => {
			log.push('reset');
			return String(fn).includes('Math.max') ? (options.scrollOffset || 0) : 0;
		},
	};
	return { page, log };
}

(async () => {
	const portfolio = fixture(4);
	await settlePortfolioImagesForEvidence(portfolio.page);
	assert.equal(portfolio.log.filter((x) => x === 'decode').length, 4);
	const crop = fixture(2);
	await settleImagesForEvidence(crop.page, '#main-content .wp-block-image img', 2);
	assert.equal(crop.log.filter((x) => x === 'decode').length, 2);
	await assert.rejects(() => settleImagesForEvidence(fixture(1).page, '#main-content .wp-block-image img', 2));
	const photography = fixture(5);
	await settlePhotographyImagesForEvidence(photography.page);
	assert.equal(photography.log.filter((x) => x === 'decode').length, 5);
	await assert.rejects(() => settlePortfolioImagesForEvidence(fixture(3).page));
	await assert.rejects(() => settlePhotographyImagesForEvidence(fixture(4).page));
	await assert.rejects(() => settlePhotographyImagesForEvidence(fixture(5, { brokenAt: 2 }).page));
	await assert.rejects(() => settlePhotographyImagesForEvidence(fixture(5, { zeroHeightAt: 2 }).page));
	await assert.rejects(() => settlePhotographyImagesForEvidence(fixture(5, { hiddenAt: 2 }).page));
	await assert.rejects(() => settlePhotographyImagesForEvidence(fixture(5, { decodeFailsAt: 2 }).page), /decode failed/);
	await assert.rejects(() => settlePhotographyImagesForEvidence(fixture(5, { scrollOffset: 8 }).page));
	await settleLightboxImageForEvidence(fixture(1).page.locator().nth(0));
	await assert.rejects(() => settleLightboxImageForEvidence(fixture(1, { brokenAt: 0 }).page.locator().nth(0)));
	await assert.rejects(() => settleLightboxImageForEvidence(fixture(1, { decodeFailsAt: 0 }).page.locator().nth(0)));
	console.log('14/14 visual evidence helper scenarios passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
