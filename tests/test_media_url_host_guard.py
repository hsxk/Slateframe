"""Reject invisible absolute media hosts without breaking relative or IDN media."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MediaURLHostGuard(unittest.TestCase):
    def test_php_media_url_host_cases(self):
        fixture = ROOT / "tests/fixtures/media-url-host-guard.php.fixture"
        result = subprocess.run(
            ["php", str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("17 web media URL cases, 8 srcset cases and 5 attachment cases passed", result.stdout)

    def test_shared_host_guard_contract(self):
        helper = (ROOT / "inc/media-source.php").read_text(encoding="utf-8")
        self.assertIn("slateframe_has_readable_media_url( wp_parse_url( $url, PHP_URL_HOST ) )", helper)
        self.assertIn("0 !== strpos( $url, '//' )", helper)


if __name__ == "__main__":
    unittest.main()
