"""Guard native Core wrapping and compact navigation viewport behavior."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NativeScrollContract(unittest.TestCase):
    def test_core_wrap_does_not_add_unnecessary_focus_stops(self):
        php = (ROOT / "functions.php").read_text()
        fixture = (ROOT / "tests/fixtures/showcase.html").read_text()
        browser = (ROOT / "tests/browser/core-code-keyboard.spec.js").read_text()
        self.assertNotIn("function slateframe_focusable_code_block(", php)
        self.assertIn("<!-- wp:code -->", fixture)
        self.assertIn("<!-- wp:preformatted -->", fixture)
        self.assertIn("browser-core-code-reading", fixture)
        for needle in ("'ltr', 'rtl'", "'200%'", "forcedColors: 'active'", "not.toHaveAttribute('tabindex', '0')", "scrollWidth"):
            self.assertIn(needle, browser)

    def test_mobile_menu_has_bounded_scroll_and_keyboard_coverage(self):
        css = (ROOT / "assets/css/navigation.css").read_text()
        browser = (ROOT / "tests/browser/header-menu-height.spec.js").read_text()
        self.assertIn("scrollbar-gutter:stable", css)
        self.assertIn("55dvh", css)
        self.assertIn("scrollHeight > node.clientHeight", browser)
        self.assertIn("toBeFocused()", browser)


if __name__ == "__main__":
    unittest.main()
