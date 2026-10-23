"""Exercise public presentation adapters with the real Slateframe PHP functions."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PresentationAdapterBoundaries(unittest.TestCase):
    def test_php_runtime_contract(self):
        result = subprocess.run(
            ["php", str(ROOT / "tests/fixtures/presentation-adapter-boundaries.php.fixture")],
            cwd=ROOT, capture_output=True, text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("Presentation adapter boundaries: 33 cases passed", result.stdout)

    def test_public_adapter_surfaces_remain_core_first(self):
        functions = (ROOT / "functions.php").read_text(encoding="utf-8")
        author = (ROOT / "author.php").read_text(encoding="utf-8")
        tags = (ROOT / "inc/template-tags.php").read_text(encoding="utf-8")
        self.assertIn("! is_string( $html ) || '' === trim( $html )", functions)
        self.assertIn("is_string( $slateframe_author_avatar )", author)
        self.assertIn("! is_array( $filtered )", tags)
        self.assertIn("wp_kses_post( $html )", functions)
        self.assertIn("wp_kses_post( $slateframe_author_avatar )", author)
        self.assertIn("esc_html( $slateframe_value )", (ROOT / "attachment.php").read_text(encoding="utf-8"))
        for source in (functions, author, tags):
            self.assertNotIn("time2log", source.lower())


if __name__ == "__main__":
    unittest.main()
