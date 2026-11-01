"""Runtime contract for native bidirectional footer identity and escaping."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
TITLE = "العربية / 日本語 — Slateframe"
DESCRIPTION = "日本語と中文 / العربية"

PHP = r"""
function is_active_sidebar($name) { return false; }
function has_nav_menu($name) { return false; }
function bloginfo($name) {
    echo htmlspecialchars($name === 'name' ? 'العربية / 日本語 — Slateframe' : '日本語と中文 / العربية',
        ENT_QUOTES, 'UTF-8');
}
function get_bloginfo($name) { return '日本語と中文 / العربية'; }
function wp_date($format) { return '2026'; }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function wp_footer() {}
ob_start();
include getcwd() . '/footer.php';
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


class FooterBidiIdentity(unittest.TestCase):
    def test_real_php_template_preserves_identity_and_isolates_direction(self):
        run = subprocess.run(["php", "-r", PHP], cwd=ROOT, text=True,
                             capture_output=True, timeout=15)
        self.assertEqual(run.returncode, 0, run.stderr)
        parser = Isolates()
        parser.feed(run.stdout)
        self.assertEqual(parser.values, [TITLE, DESCRIPTION, "© 2026", TITLE])
        self.assertIn('<strong><bdi>', run.stdout)
        self.assertIn('<p><bdi>', run.stdout)
        self.assertIn('<p class="slateframe-copyright">', run.stdout)
        self.assertNotIn('<script', run.stdout)

    def test_footer_uses_core_identity_without_forcing_language_direction(self):
        source = (ROOT / "footer.php").read_text(encoding="utf-8")
        self.assertEqual(source.count("<bdi>"), 4)
        self.assertEqual(source.count("</bdi>"), 4)
        self.assertNotIn('dir="ltr"', source)
        self.assertNotIn('dir="rtl"', source)
        self.assertIn("bloginfo( 'name' )", source)
        self.assertIn("bloginfo( 'description' )", source)
        self.assertIn("wp_date( 'Y' )", source)
        self.assertIn("wp_nav_menu(", source)
        self.assertIn("wp_footer();", source)


if __name__ == "__main__":
    unittest.main()
