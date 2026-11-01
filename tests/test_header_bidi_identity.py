"""Execute the real Core header template with mixed Arabic/CJK identity."""
from html.parser import HTMLParser
from pathlib import Path
import os
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
TITLE = "العربية / 日本語 — Slateframe"
DESCRIPTION = "日本語と中文 / العربية"
PHP = r"""
define('COOKIEPATH', '/');
function language_attributes() { echo 'lang="en-US" dir="rtl"'; }
function bloginfo($key) {
    echo htmlspecialchars($key === 'name' ? 'العربية / 日本語 — Slateframe'
        : ($key === 'description' ? '日本語と中文 / العربية' : 'UTF-8'),
        ENT_QUOTES, 'UTF-8');
}
function get_bloginfo($key) {
    return getenv('EMPTY_TAGLINE') === '1' ? '' : '日本語と中文 / العربية';
}
function wp_head() {}
function body_class() { echo 'class="home"'; }
function wp_body_open() {}
function home_url($path) { return '/'; }
function esc_url($value) { return $value; }
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function slateframe_brand_mark() {}
function wp_nav_menu($args) {}
function slateframe_language_switcher() {}
function esc_attr_e($value, $domain) { echo htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_html_e($value, $domain) { echo htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
ob_start();
include getcwd() . '/header.php';
echo ob_get_clean();
"""


class Isolates(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.inside = False
        self.parts = []
        self.values = []

    def handle_starttag(self, tag, attrs):
        if tag == "bdi":
            self.inside = True
            self.parts = []

    def handle_data(self, data):
        if self.inside:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == "bdi":
            self.values.append("".join(self.parts))
            self.inside = False


class HeaderBidiIdentity(unittest.TestCase):
    def render(self, empty=False):
        env = {**os.environ, "EMPTY_TAGLINE": "1" if empty else "0"}
        result = subprocess.run(["php", "-r", PHP], cwd=ROOT, text=True,
                                capture_output=True, timeout=15, env=env)
        self.assertEqual(result.returncode, 0, result.stderr)
        parser = Isolates()
        parser.feed(result.stdout)
        return result.stdout, parser.values

    def test_real_php_header_isolates_title_and_tagline(self):
        html, values = self.render()
        self.assertEqual(values, [TITLE, DESCRIPTION])
        self.assertIn('class="slateframe-brand-title"><bdi>', html)
        self.assertIn('class="slateframe-brand-tagline"><bdi>', html)
        self.assertIn('aria-label="Primary navigation"', html)
        self.assertIn('href="#main-content"', html)
        self.assertNotIn('<script', html)

    def test_empty_core_tagline_does_not_render_empty_boundary(self):
        html, values = self.render(empty=True)
        self.assertEqual(values, [TITLE])
        self.assertNotIn('class="slateframe-brand-tagline"', html)

    def test_core_identity_and_navigation_remain_unmodified(self):
        source = (ROOT / "header.php").read_text(encoding="utf-8")
        self.assertEqual(source.count("<bdi>"), 2)
        self.assertEqual(source.count("</bdi>"), 2)
        self.assertNotIn('dir="ltr"', source)
        self.assertNotIn('dir="rtl"', source)
        for marker in ("bloginfo( 'name' )", "bloginfo( 'description' )",
                       "wp_head();", "wp_nav_menu(", "slateframe_brand_mark();",
                       "slateframe_language_switcher();", "data-menu-toggle",
                       "data-color-toggle", "Skip to content"):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)


if __name__ == "__main__":
    unittest.main()
