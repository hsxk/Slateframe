"""Keep the site-neutral editorial pathways pattern Core-native and parseable."""

from pathlib import Path
import re
import unittest

PATTERN = Path(__file__).resolve().parents[1] / 'patterns' / 'editorial-pathways.php'


class EditorialPathwaysPattern(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = PATTERN.read_text(encoding='utf-8')

    def test_block_comments_are_properly_nested(self):
        stack = []
        for match in re.finditer(r'<!--\s*(/?)wp:([\w/-]+)(?:\s+\{.*?\})?\s*(/?)-->', self.source):
            closing, block, self_closing = match.groups()
            self.assertTrue(block.startswith(('group', 'paragraph', 'heading', 'columns', 'column')))
            if closing:
                self.assertTrue(stack, f'unexpected closing {block}')
                self.assertEqual(stack.pop(), block)
            elif not self_closing:
                stack.append(block)
        self.assertEqual(stack, [])

    def test_one_intro_and_three_distinct_directions(self):
        self.assertEqual(self.source.count('<!-- wp:columns'), 1)
        self.assertEqual(self.source.count('<!-- wp:column -->'), 3)
        self.assertEqual(self.source.count('<!-- wp:heading {"level":2} -->'), 1)
        self.assertEqual(self.source.count('<!-- wp:heading {"level":3} -->'), 3)
        self.assertEqual(self.source.count('slateframe-pattern-intro'), 2)
        self.assertEqual(self.source.count('is-style-slateframe-ledger'), 2)

    def test_portable_localized_text_without_broken_links(self):
        self.assertEqual(self.source.count('esc_html_x('), 12)
        self.assertNotIn('http://', self.source)
        self.assertNotIn('https://', self.source)
        self.assertNotRegex(self.source, r'<a\s|<img\s|href=|time2log|t2l-|--t2l-')
        self.assertEqual(self.source.count("'Pattern content', 'slateframe'"), 12)
        self.assertIn('Slug: slateframe/editorial-pathways', self.source)


if __name__ == '__main__':
    unittest.main()
