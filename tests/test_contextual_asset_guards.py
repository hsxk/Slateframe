"""Exercise malformed marker filters and Core block trees against actual PHP."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ContextualAssetGuards(unittest.TestCase):
    def test_php_runtime(self):
        fixture = ROOT / "tests/fixtures/contextual-assets.php.fixture"
        result = subprocess.run(
            ["php", str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("Contextual assets: 58 assertions passed", result.stdout)

    def test_source_guards(self):
        source = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("! is_string( $content )", source)
        self.assertIn("! is_array( $blocks )", source)
        self.assertNotIn("array_unique( $markers )", source)


if __name__ == "__main__":
    unittest.main()
