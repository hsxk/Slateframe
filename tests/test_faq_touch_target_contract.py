"""Keep all Core FAQ summary targets at least 44 CSS pixels across editor viewports."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
EDITOR = ROOT / 'tests/browser/knowledge-faq-editor.spec.js'


class FaqTouchTargetContract(unittest.TestCase):
    def test_all_responsive_viewports_enforce_44px(self):
        source = EDITOR.read_text(encoding='utf-8')
        self.assertIn('for (const width of [320, 375, 390, 412, 768, 1440, 1920])', source)
        self.assertIn("for (const direction of ['ltr', 'rtl'])", source)
        self.assertIn('expect(box.height).toBeGreaterThanOrEqual(44)', source)
        self.assertNotIn('expect(box.height).toBeGreaterThanOrEqual(43)', source)


if __name__ == '__main__':
    unittest.main()
