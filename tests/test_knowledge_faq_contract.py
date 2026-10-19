"""Knowledge FAQ stays portable, translatable and Core-native."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATTERN = ROOT / 'patterns/knowledge-faq.php'
BROWSER = ROOT / 'tests/browser/knowledge-faq.spec.js'


class KnowledgeFaqContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = PATTERN.read_text(encoding='utf-8')

    def test_registered_slug_and_core_only(self):
        source = self.source
        self.assertIn('Slug: slateframe/knowledge-faq', source)
        self.assertIn('Categories: slateframe, slateframe-knowledge', source)
        self.assertEqual(source.count('<!-- wp:details'), 3)
        self.assertEqual(source.count('<!-- /wp:details -->'), 3)
        self.assertEqual(source.count('<summary>'), 3)
        self.assertEqual(source.count('</summary>'), 3)
        self.assertNotRegex(source, r'<!-- wp:(?!group|paragraph|heading|details)[^\s]+')
        self.assertNotRegex(source, r'(?i)(?:https?://|time2log|t2l-|--t2l-|license|\bpro\b)')

    def test_block_comments_are_nested_and_native(self):
        stack = []
        for match in re.finditer(r'<!--\s*(/?)wp:([\w/-]+)(?:\s+\{.*?\})?\s*(/?)-->', self.source):
            closing, block, self_closing = match.groups()
            if closing:
                self.assertTrue(stack, f'unexpected closing {block}')
                self.assertEqual(stack.pop(), block)
            elif not self_closing:
                stack.append(block)
        self.assertEqual(stack, [])
        self.assertIn('class="wp-block-details is-style-slateframe-disclosure"', self.source)
        self.assertIn('class="wp-block-details"', self.source)
        self.assertNotIn('role="button"', self.source)
        self.assertNotIn('aria-expanded', self.source)

    def test_all_copy_is_translatable_and_plain_text(self):
        source = self.source
        self.assertEqual(source.count('esc_html_x('), 10)
        self.assertEqual(source.count("'slateframe'"), 10)
        self.assertEqual(source.count("'Pattern question'"), 3)
        self.assertEqual(source.count("'Pattern answer'"), 3)
        self.assertNotRegex(source, r'<(?:a|script|iframe|img)\b')

    def test_fullpage_capture_resets_keyboard_focus_scroll_and_control_override(self):
        source = BROWSER.read_text(encoding='utf-8')
        self.assertIn("window.scrollTo({ top: 0, left: 0, behavior: 'instant' })", source)
        self.assertIn('Math.abs(window.scrollY)', source)
        self.assertIn('await summary.evaluate(node => node.blur())', source)
        self.assertIn("node.style.removeProperty('--slateframe-control')", source)

    def test_real_wordpress_browser_matrix_and_cleanup(self):
        source = BROWSER.read_text(encoding='utf-8')
        for needle in (
            'slateframe/knowledge-faq', 'WP_Block_Patterns_Registry',
            '--post_type=page', '--post_content=', "wp('post', 'delete', id, '--force')",
            '[320, 375, 390, 412, 768, 1440, 1920]', "['ltr', 'rtl']",
            "summary.press('Enter')", "summary.press('Space')",
            "forcedColors: 'active'", "'200%'", "media: 'print'",
            'knowledge-faq-390-rtl-200-forced-colors.png',
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, source)


if __name__ == '__main__':
    unittest.main()
