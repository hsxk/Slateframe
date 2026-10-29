"""Keep the public starter-pattern inventory aligned with distributable patterns."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PatternDocumentationCount(unittest.TestCase):
    def test_readme_inventory_matches_pattern_files(self):
        readme = (ROOT / 'README.md').read_text(encoding='utf-8')
        self.assertIn('### Photography, portfolio, and knowledge', readme)
        section = readme.split('### Photography, portfolio, and knowledge', 1)[1]
        section = section.split('\nBlock styles add', 1)[0]
        declared = re.search(r'currently ships (\d+) site-neutral starter patterns', section)
        self.assertIsNotNone(declared)
        numbers = [int(value) for value in re.findall(r'(?m)^(\d+)\. \*\*', section)]
        patterns = sorted((ROOT / 'patterns').glob('*.php'))
        self.assertEqual(int(declared.group(1)), len(patterns))
        self.assertEqual(numbers, list(range(1, len(patterns) + 1)))

    def test_editorial_pullquote_has_public_inventory_entry(self):
        readme = (ROOT / 'README.md').read_text(encoding='utf-8')
        self.assertIn('24. **Editorial pullquote**', readme)
        self.assertTrue((ROOT / 'patterns/editorial-pullquote.php').is_file())

    def test_glossary_inventory(self):
        readme = (ROOT / 'README.md').read_text(encoding='utf-8')
        self.assertIn('26. **Knowledge glossary**', readme)
        self.assertTrue((ROOT / 'patterns/knowledge-glossary.php').is_file())

    def test_wordpress_readme_mentions_native_faq(self):
        readme = (ROOT / 'readme.txt').read_text(encoding='utf-8')
        self.assertIn('knowledge outlines/definitions/checkpoints/procedures/comparisons/questions-and-answers', readme)
        self.assertIn('editorial openings/notes/pathways/pullquotes', readme)


if __name__ == '__main__':
    unittest.main()
