"""Preserve native header interactions while reducing shared runtime bytes."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / 'assets/js/theme.js').read_text(encoding='utf-8')


class HeaderRuntimeCompaction(unittest.TestCase):
    def test_shared_script_does_not_regress_byte_budget(self):
        self.assertLessEqual(len(JS.encode('utf-8')), 3376)
        self.assertNotIn('footnote', JS.lower())

    def test_ime_focus_color_and_responsive_guards_remain(self):
        for token in (
            'isComposing', 'keyCode===229', "e.key==='Escape'",
            'aria-expanded', 'ResizeObserver', 'MutationObserver',
            'matchMedia', 'aria-pressed', 'SameSite=Lax',
            "'inert'", 'pointerdown', 'focusin',
        ):
            with self.subTest(token=token):
                self.assertIn(token, JS)


if __name__ == '__main__':
    unittest.main()
