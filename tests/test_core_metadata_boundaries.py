"""Exercise real theme author and attachment metadata helpers with strict PHP warnings."""
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreMetadataBoundaries(unittest.TestCase):
    def test_php_runtime(self):
        fixture = ROOT / "tests/fixtures/core-metadata-boundaries.php.fixture"
        result = subprocess.run(
            ["php", str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        match = re.search(r"Core metadata boundaries: (\d+) cases passed", result.stdout)
        self.assertIsNotNone(match, result.stdout)
        self.assertGreaterEqual(int(match.group(1)), 60)

    def test_shared_positive_integer_boundary(self):
        source = (ROOT / "inc/template-tags.php").read_text(encoding="utf-8")
        self.assertIn("function slateframe_positive_int( $value )", source)
        self.assertIn("slateframe_positive_int( get_the_author_meta( 'ID' ) )", source)
        self.assertIn("is_string( $raw_author )", source)
        self.assertIn("slateframe_positive_int( isset( $metadata['width'] )", source)
        self.assertIn("slateframe_positive_int( isset( $metadata['filesize'] )", source)
        self.assertNotIn("time2log", source.lower())


if __name__ == "__main__":
    unittest.main()
