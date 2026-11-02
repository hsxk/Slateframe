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
        self.assertIn("51 web media URL cases, 17 srcset cases and 14 attachment cases passed", result.stdout)

    def test_shared_host_guard_contract(self):
        helper = (ROOT / "inc/media-source.php").read_text(encoding="utf-8")
        self.assertIn("slateframe_has_readable_media_url( $host )", helper)
        self.assertIn("preg_match( '/[\\\\p{L}\\\\p{N}]/u'", helper)
        self.assertIn("0 !== strpos( $validation_url, '//' )", helper)
        self.assertIn("rawurldecode( $host )", helper)
        self.assertIn("wp_parse_url( $validation_url, PHP_URL_SCHEME )", helper)
        self.assertIn("wp_parse_url( $validation_url, PHP_URL_HOST )", helper)
        self.assertIn("preg_match( '/[\\x00-\\x1F\\x7F]/', $url )", helper)
        self.assertIn("stripos( $host, '%3a' )", helper)
        self.assertIn("$decoded_host", helper)


if __name__ == "__main__":
    unittest.main()
