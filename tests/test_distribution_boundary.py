"""Public, GPL-only WordPress theme release boundary regressions."""
import importlib.util
import io
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('boundary', ROOT / 'bin' / 'check-distribution-boundary.py')
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


def make_zip(path='slateframe/functions.php', content='<?php function slateframe_example() {}'):
    memory = io.BytesIO()
    with zipfile.ZipFile(memory, 'w') as z:
        z.writestr(path, content)
    memory.seek(0)
    return zipfile.ZipFile(memory)


class DistributionBoundary(unittest.TestCase):
    def reject(self, path, content, expected):
        with make_zip(path, content) as z:
            with self.assertRaisesRegex(ValueError, expected):
                AUDIT.audit_release(z)

    def test_valid_public_php(self):
        with make_zip() as z:
            self.assertEqual(AUDIT.audit_release(z), 1)

    def test_old_blog_identifier(self):
        self.reject('slateframe/inc/example.php', '<?php echo "time2log";', 'legacy')

    def test_old_analysis_domain(self):
        self.reject('slateframe/assets/js/theme.js', 'const url="https://time2analyze.com";', 'legacy')

    def test_old_sunset_identifier(self):
        self.reject('slateframe/assets/css/feature.css', '.where_the_sun_sets{}', 'legacy')

    def test_old_plugin_prefix(self):
        self.reject('slateframe/inc/example.php', '<?php wp_branches_for_post();', 'legacy')

    def test_paid_upgrade(self):
        self.reject('slateframe/readme.txt', 'Upgrade to Pro to unlock', 'paid')

    def test_license_activation(self):
        self.reject('slateframe/assets/js/theme.js', 'Activate your license key', 'paid')

    def test_private_key(self):
        self.reject('slateframe/inc/example.php', '-----BEGIN PRIVATE KEY-----', 'credential')

    def test_cloud_access_key(self):
        self.reject('slateframe/assets/js/theme.js', 'AKIAABCDEFGHIJKLMNOP', 'credential')

    def test_remote_css_asset(self):
        self.reject('slateframe/assets/css/example.css', 'a{background:url(https://cdn.example.com/a.png)}', 'remote')

    def test_remote_css_import(self):
        self.reject('slateframe/assets/css/example.css', '@import "other.css";', 'remote')

    def test_remote_browser_fetch(self):
        self.reject('slateframe/assets/js/theme.js', 'fetch("https://example.org")', 'network')

    def test_remote_php_call(self):
        self.reject('slateframe/inc/example.php', '<?php wp_remote_get($url);', 'network')

    def test_legitimate_wordpress_and_gpl_metadata(self):
        with make_zip('slateframe/style.css', 'Theme URI: https://github.com/hsxk/Slateframe\nLicense: GNU General Public License v3 or later\nText Domain: slateframe') as z:
            self.assertEqual(AUDIT.audit_release(z), 1)

    def test_non_utf8_text_rejected(self):
        self.reject('slateframe/assets/js/theme.js', b'\xff\xfe', 'non-UTF-8')

    def test_no_theme_text_rejected(self):
        with make_zip('slateframe/screenshot.png', b'png') as z:
            with self.assertRaisesRegex(ValueError, 'no distributable'):
                AUDIT.audit_release(z)

    def test_no_false_positive_for_generic_prose(self):
        with make_zip('slateframe/readme.txt', 'Professional typography, GPL, license terms and project portfolio.') as z:
            self.assertEqual(AUDIT.audit_release(z), 1)


if __name__ == '__main__':
    unittest.main()
