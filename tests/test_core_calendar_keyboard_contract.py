"""Core Calendar must remain a native table with a keyboard scroll stop."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreCalendarKeyboardContract(unittest.TestCase):
    def test_runtime_filter_is_narrow_and_non_destructive(self):
        source = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("function slateframe_focusable_calendar_block( $block_content )", source)
        self.assertIn("add_filter( 'render_block_core/calendar', 'slateframe_focusable_calendar_block' );", source)
        self.assertIn("$processor->has_class( 'wp-block-calendar' )", source)
        self.assertIn("null === $processor->get_attribute( 'tabindex' )", source)
        self.assertIn("$processor->set_attribute( 'tabindex', '0' )", source)
        self.assertNotIn("role=\"table\"", source)

    def test_real_wp_fixture_covers_keyboard_and_zoom(self):
        browser = (ROOT / "tests/browser/core-calendar-keyboard.spec.js").read_text(encoding="utf-8")
        for token in ("<!-- wp:calendar /-->", "'ArrowLeft'", "'ArrowRight'",
                      "[320, 375, 390, 412, 768, 1440, 1920]", "['ltr', 'rtl']",
                      "fontSize = '200%'", "forcedColors: 'active'", "toBeFocused()",
                      "--force", "finally"):
            with self.subTest(token=token):
                self.assertIn(token, browser)


if __name__ == '__main__':
    unittest.main()
