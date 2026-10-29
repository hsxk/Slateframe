"""Core-only glossary pattern structure and browser evidence contract."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATTERN = ROOT / 'patterns/knowledge-glossary.php'
BROWSER = ROOT / 'tests/browser/knowledge-glossary.spec.js'


class KnowledgeGlossaryContract(unittest.TestCase):
    def test_balanced_core_blocks(self):
        source = PATTERN.read_text(encoding='utf-8')
        self.assertIn('Slug: slateframe/knowledge-glossary', source)
        self.assertEqual(4, source.count('<!-- wp:group {'))
        self.assertEqual(4, source.count('<!-- /wp:group -->'))
        self.assertEqual(4, source.count('<!-- wp:heading {'))
        self.assertEqual(4, source.count('<!-- /wp:heading -->'))
        names = re.findall(r'<!-- wp:([a-z0-9/-]+) ', source)
        self.assertTrue(all(name in {'group', 'heading', 'paragraph'} for name in names))
        self.assertGreaterEqual(source.count('esc_html_x('), 12)
        self.assertEqual(source.count('esc_html_x('), source.count("'slateframe' );"))
        for forbidden in ('https://', 'time2log', 'time2analyze', 'upgrade to pro'):
            self.assertNotIn(forbidden, source.lower())

    def test_real_wordpress_editor_and_responsive_coverage(self):
        source = BROWSER.read_text(encoding='utf-8')
        for expected in ('320, 375, 390, 412, 768, 1440, 1920', "'ltr', 'rtl'",
                         '[16, 32, 64]', 'AxeBuilder', 'openAuthenticatedEditor',
                         'knowledge-glossary-390-rtl-400', 'knowledge-glossary-1440-ltr',
                         'core/missing', '日本語', '中文术语', 'مصطلح',
                         'UnbrokenGlossaryIdentifier'):
            self.assertIn(expected, source)


if __name__ == '__main__':
    unittest.main()
