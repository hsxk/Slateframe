"""Guard native Core scroll and compact navigation regression coverage."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NativeScrollContract(unittest.TestCase):
    def test_core_only_keyboard_filters(self):
        php = (ROOT / "functions.php").read_text()
        self.assertIn("function slateframe_focusable_code_block(", php)
        for block in ("code", "preformatted"):
            self.assertIn(f"render_block_core/{block}', 'slateframe_focusable_code_block'", php)
        self.assertIn("null === $processor->get_attribute( 'tabindex' )", php)
        self.assertNotIn("add_filter( 'the_content', 'slateframe_focusable_code_block'", php)

    def test_real_wordpress_and_mobile_regressions(self):
        fixture = (ROOT / "tests/fixtures/showcase.html").read_text()
        code = (ROOT / "tests/browser/core-code-keyboard.spec.js").read_text()
        nav = (ROOT / "tests/browser/header-menu-height.spec.js").read_text()
        css = (ROOT / "assets/css/navigation.css").read_text()
        self.assertIn("<!-- wp:code -->", fixture)
        self.assertIn("<!-- wp:preformatted -->", fixture)
        for needle in ("'ltr', 'rtl'", "ArrowLeft", "ArrowRight", "'200%'", "forcedColors: 'active'"):
            self.assertIn(needle, code)
        self.assertIn("scrollbar-gutter:stable", css)
        self.assertIn("55dvh", css)
        self.assertIn("scrollHeight > node.clientHeight", nav)
        self.assertIn("toBeFocused()", nav)


if __name__ == "__main__":
    unittest.main()
