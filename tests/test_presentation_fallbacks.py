"""Exercise resilient Core title, featured caption and page-menu boundaries."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PresentationFallbacks(unittest.TestCase):
    def test_php_runtime(self):
        fixture = ROOT / "tests/fixtures/presentation-fallbacks.php.fixture"
        result = subprocess.run(
            ["php", str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("Presentation fallbacks: 51 assertions passed", result.stdout)

    def test_public_core_boundary(self):
        source = (ROOT / "inc/template-tags.php").read_text(encoding="utf-8")
        self.assertIn("! is_string( $title )", source)
        self.assertIn("is_string( $caption )", source)
        self.assertIn("is_string( $pages ) ? $pages : ''", source)
        self.assertNotIn("time2log", source.lower())


if __name__ == "__main__":
    unittest.main()
