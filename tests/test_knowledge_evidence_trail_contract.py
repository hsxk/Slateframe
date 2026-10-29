"""Evidence-trail pattern stays portable, translatable and Core-native."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATTERN = ROOT / 'patterns/knowledge-evidence-trail.php'
BROWSER = ROOT / 'tests/browser/knowledge-evidence-trail.spec.js'


class KnowledgeEvidenceTrailContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = PATTERN.read_text(encoding='utf-8')

    def test_registered_slug_and_core_only(self):
        source = self.source
        self.assertIn('Slug: slateframe/knowledge-evidence-trail', source)
        self.assertIn('Categories: slateframe, slateframe-knowledge', source)
        self.assertEqual(source.count('<!-- wp:column -->'), 3)
        self.assertEqual(source.count('<!-- /wp:column -->'), 3)
        self.assertEqual(source.count('<!-- wp:heading {"level":3} -->'), 3)
        self.assertNotRegex(source, r'<!-- wp:(?!group|paragraph|heading|columns|column)[^\s]+')

    def test_nested_core_comments_are_balanced(self):
        stack = []
        for match in re.finditer(r'<!--\s*(/?)wp:([\w/-]+)(?:\s+\{.*?\})?\s*(/?)-->', self.source):
            closing, block, self_closing = match.groups()
            if closing:
                self.assertTrue(stack)
                self.assertEqual(stack.pop(), block)
            elif not self_closing:
                stack.append(block)
        self.assertEqual(stack, [])

    def test_localized_editorial_prompts_without_links_or_site_data(self):
        source = self.source
        self.assertEqual(source.count('esc_html_x('), 10)
        self.assertEqual(source.count("'slateframe'"), 10)
        self.assertNotRegex(source, r'(?i)(?:https?://|time2log|t2l-|--t2l-|license|\bpro\b)')
        self.assertNotRegex(source, r'<(?:a|script|iframe|img|form)\b')
        self.assertNotIn('aria-', source)

    def test_real_wordpress_matrix_and_editor_roundtrip(self):
        source = BROWSER.read_text(encoding='utf-8')
        for needle in (
            'WP_Block_Patterns_Registry', 'slateframe/knowledge-evidence-trail',
            '[320, 375, 390, 412, 768, 1440, 1920]',
            "['ltr', 'rtl']", '[16, 32, 64]', 'AxeBuilder',
            'knowledge-evidence-390-rtl-200-forced-colors.png',
            'knowledge-evidence-390-rtl-400-forced-colors.png',
            'knowledge-evidence-1440-ltr.png', 'openAuthenticatedEditor',
            'UnbrokenEvidenceIdentifier', 'textOutsideColumn',
            "['claim', 'source', 'limits']", 'scrollIntoViewIfNeeded',
            'core/missing', "wp('post', 'delete', id, '--force')",
            "[[390, 'rtl', '200%'], [1440, 'ltr', '']]",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, source)


if __name__ == '__main__':
    unittest.main()
