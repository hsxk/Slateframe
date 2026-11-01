"""Theme-owned titles isolate mixed scripts without modifying Core block titles."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
SURFACES = {
    'single.php': '<h1 class="slateframe-entry-title"><bdi>',
    'page.php': '<h1 class="slateframe-entry-title"><bdi>',
    'attachment.php': '<h1 class="slateframe-entry-title"><bdi>',
    'template-parts/content-card.php': '<a href="<?php the_permalink(); ?>" rel="bookmark"><bdi>',
    '404.php': '<span class="slateframe-related-title"><bdi>',
    'inc/content-discovery.php': '<span class="slateframe-related-title"><bdi>',
}

class ThemeTitleBidi(unittest.TestCase):
    def test_each_theme_title_surface_is_isolated(self):
        for path, markup in SURFACES.items():
            with self.subTest(path=path):
                source = (ROOT / path).read_text(encoding='utf-8')
                self.assertIn(markup, source)
                self.assertEqual(source.count('<bdi><?php echo wp_kses_post( slateframe_get_display_title() ); ?></bdi>'), 1)
                self.assertNotIn('dir="ltr"', source)

    def test_core_post_title_remains_unmodified(self):
        for path in ('single.php', 'page.php', 'attachment.php', 'template-parts/content-card.php'):
            self.assertNotIn('render_block(', (ROOT / path).read_text(encoding='utf-8'))

    def test_no_new_runtime_script_or_style(self):
        for path in SURFACES:
            source = (ROOT / path).read_text(encoding='utf-8')
            self.assertNotIn('<script', source)
            self.assertNotIn('style="unicode-bidi', source)

    def test_php_syntax_of_changed_templates(self):
        for path in SURFACES:
            with self.subTest(path=path):
                result = subprocess.run(['php', '-l', str(ROOT / path)], text=True,
                                        capture_output=True, timeout=15)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

if __name__ == '__main__':
    unittest.main()
