"""Executable PHP and real-browser contract for blank Core footer identities."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FooterReadableIdentity(unittest.TestCase):
    def test_actual_footer_template_handles_empty_and_multilingual_identity(self):
        run = subprocess.run(
            ['php', str(ROOT / 'tests/fixtures/footer-blank-identity.php.fixture')],
            cwd=ROOT, capture_output=True, text=True, timeout=20, check=False,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn('Footer readable identity: 12 cases passed', run.stdout)

    def test_preserves_core_footer_and_uses_shared_readable_label_helper(self):
        source = (ROOT / 'footer.php').read_text(encoding='utf-8')
        for marker in ("slateframe_has_readable_label( get_bloginfo( 'name', 'display' ) )",
                       "slateframe_has_readable_label( get_bloginfo( 'description', 'display' ) )",
                       "slateframe_footer_display_name( $slateframe_footer_has_title )", "bloginfo( 'name' )",
                       "bloginfo( 'description' )", "wp_date( 'Y' )",
                       'dynamic_sidebar(', 'wp_nav_menu(', 'wp_footer();', '<bdi>'):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)
        helper = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        self.assertIn("function slateframe_footer_display_name( $has_readable_name )", helper)
        self.assertIn("esc_html_e( 'Home', 'slateframe' )", helper)
        self.assertNotIn('dir="ltr"', source)
        self.assertNotIn('dir="rtl"', source)

    def test_real_wordpress_browser_covers_footer_accessibility_and_visual_evidence(self):
        source = (ROOT / 'tests/browser/footer-readable-identity.spec.js').read_text(encoding='utf-8')
        for marker in ('pre_option_blogname', 'pre_option_blogdescription',
                       'include get_stylesheet_directory()', '320, 375, 390, 412, 768, 1440, 1920',
                       "'ltr', 'rtl'", 'setRootTextScale', 'AxeBuilder', 'forcedColors',
                       'footer-blank-identity-390-rtl-400-forced-colors.png',
                       'footer-blank-identity-1440-ltr.png'):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)


if __name__ == '__main__':
    unittest.main()
