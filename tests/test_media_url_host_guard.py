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
        self.assertIn("78 web media URL cases, 28 srcset cases and 24 attachment cases passed", result.stdout)

    def test_shared_host_guard_contract(self):
        helper = (ROOT / "inc/media-source.php").read_text(encoding="utf-8")
        self.assertIn("slateframe_has_readable_media_url( $host )", helper)
        self.assertIn("preg_match( '/[\\\\p{L}\\\\p{N}]/u'", helper)
        self.assertIn("0 !== strpos( $validation_url, '//' )", helper)
        self.assertIn("rawurldecode( $host )", helper)
        self.assertIn("preg_match( '/%(?![0-9A-Fa-f]{2})/', $host )", helper)
        self.assertIn("false !== strpos( $decoded_host, '%' )", helper)
        self.assertIn("preg_match( '//u', $decoded_host )", helper)
        self.assertIn("wp_parse_url( $validation_url, PHP_URL_SCHEME )", helper)
        self.assertIn("wp_parse_url( $validation_url, PHP_URL_HOST )", helper)
        self.assertIn("preg_match( '/[\\x00-\\x1F\\x7F]/', $url )", helper)
        self.assertIn("stripos( $host, '%3a' )", helper)
        self.assertIn("$decoded_host", helper)
        self.assertIn(r"\x{202A}-\x{202E}", helper)
        self.assertIn(r"\x{2066}-\x{2069}", helper)
        self.assertIn(r"\x{200B}", helper)
        self.assertIn("2 === strspn( $leading", helper)
        self.assertIn("false !== strpos( $authority", helper)
        self.assertIn("strcspn( $validation_url, '/?#', $authority_start )", helper)


if __name__ == "__main__":
    unittest.main()
