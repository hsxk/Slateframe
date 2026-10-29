"""The release preview must depict an ordinary Core-authored site, not theme advertising."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NeutralReleasePreview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = (ROOT / 'tests/fixtures/release-preview.html').read_text()
        cls.browser = (ROOT / 'tests/browser/release-screenshot.spec.js').read_text()
        cls.old_browser = (ROOT / 'tests/browser/theme.spec.js').read_text()
        cls.workflow = (ROOT / '.github/workflows/quality.yml').read_text()

    def test_only_core_blocks(self):
        opened = re.findall(r'<!-- wp:([\w-]+)(?: \{[^\n]*\})? -->', self.fixture)
        closed = re.findall(r'<!-- /wp:([\w-]+) -->', self.fixture)
        self.assertEqual(len(opened), len(closed))
        self.assertEqual(sorted(opened), sorted(closed))
        self.assertGreaterEqual(len(opened), 8)
        self.assertTrue(set(opened) <= {'paragraph', 'columns', 'column', 'heading', 'image'})

    def test_generic_content_not_theme_feature_copy(self):
        for phrase in ('A clean frame for whatever you publish', 'Fast, accessible publishing',
                       'Readable by default', 'Structure without lock-in',
                       'page-builder dependency', 'theme features', 'license', 'Pro plan'):
            self.assertNotIn(phrase.lower(), self.fixture.lower())
        self.assertIn('Field notes', self.fixture)

    def test_no_external_or_personal_assets(self):
        self.assertNotRegex(self.fixture, r'https?://|//[^ >]+|time2log|time2analyze|wp-branches-for-post')
        self.assertIn('/wp-content/uploads/slateframe-fixtures/slateframe-landscape.svg', self.fixture)
        self.assertIn('alt="Illustrated landscape', self.fixture)

    def test_actual_wordpress_screenshot_not_simulated(self):
        for token in ('execFileSync', "wp('post', 'create'", "wp('post', 'delete'",
                      "await page.goto('/?page_id=' + id", 'page.screenshot({',
                      'width: 1200, height: 900', 'node.complete && node.naturalWidth > 0',
                      'document.documentElement.scrollWidth'):
            self.assertIn(token, self.browser)
        self.assertNotIn('canvas', self.browser.lower())
        self.assertNotIn('sharp', self.browser.lower())

    def test_single_release_screenshot_producer(self):
        self.assertNotIn('wordpress-org-screenshot-candidate.png', self.old_browser)
        self.assertEqual(self.browser.count('wordpress-org-screenshot-candidate.png'), 1)
        self.assertIn('python3 bin/check-screenshot.py test-artifacts/screenshots/wordpress-org-screenshot-candidate.png', self.workflow)


if __name__ == '__main__':
    unittest.main()
