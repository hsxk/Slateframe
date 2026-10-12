"""Compact header Escape must not consume active CJK input composition."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HeaderImeContract(unittest.TestCase):
    def test_escape_respects_composition_and_handled_events(self):
        source = (ROOT / "assets/js/theme.js").read_text()
        self.assertEqual(source.count("d.addEventListener('keydown'"), 1)
        self.assertIn("e.defaultPrevented||e.isComposing||e.keyCode===229", source)
        self.assertIn("e.key==='Escape'&&h.classList.contains('is-open')", source)
        self.assertIn("e.preventDefault();close(true)", source)

    def test_browser_covers_cjk_and_normal_keyboard_exit(self):
        source = (ROOT / "tests/browser/header-ime-composition.spec.js").read_text()
        for item in (
            "['ltr', 'rtl']", "isComposing: true", "keyCode', { value: 229",
            "event.preventDefault()", "page.keyboard.press('Escape')",
            "toHaveAttribute('inert', '')", "toBeFocused()",
        ):
            with self.subTest(item=item):
                self.assertIn(item, source)


if __name__ == '__main__':
    unittest.main()
