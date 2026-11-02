"""Guard Core image source checks against invisible URL plus readable descriptors."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ImageSourceVisibility(unittest.TestCase):
    def test_php_url_candidates(self):
        fixture = ROOT / 'tests/fixtures/image-source-visibility.php.fixture'
        result = subprocess.run(
            ['php', str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('Image source visibility: 32 cases passed', result.stdout)

    def test_shared_guard_on_hero_and_attachment(self):
        helper = (ROOT / 'inc/media-source.php').read_text(encoding='utf-8')
        featured = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        attachment = (ROOT / 'attachment.php').read_text(encoding='utf-8')
        self.assertIn('function slateframe_image_has_source( $src, $srcset )', helper)
        self.assertIn("slateframe_has_web_media_url( rtrim( $token, \u0027,\u0027 ) )", helper)
        self.assertIn('slateframe_image_has_source( $image_src, $image_srcset )', featured)
        self.assertIn('slateframe_image_has_source(', attachment)
        self.assertIn('$slateframe_image_srcset', attachment)
        self.assertNotIn('time2log', helper.lower())

    def test_invisible_image_visual_evidence_is_mandatory(self):
        name = "media-invisible-image-390-rtl-400-forced-colors.png"
        contract = (ROOT / "bin/check-visual-coverage.py").read_text(encoding="utf-8")
        browser = (ROOT / "tests/browser/media-readable-caption.spec.js").read_text(encoding="utf-8")
        self.assertIn(f'"{name}": 390', contract)
        self.assertIn(name, browser)
        self.assertLess(browser.index("await fs.mkdir('test-artifacts/screenshots'"),
                        browser.index(f"test-artifacts/screenshots/{name}"))


if __name__ == '__main__':
    unittest.main()
