"""Guard Core-first, plugin-neutral reading presentation."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PluginNeutralPresentationTest(unittest.TestCase):
    def test_no_plugin_specific_content_rewriter(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        self.assertNotIn("tablepress", php.lower())
        self.assertNotIn("tablepress", css.lower())
        self.assertNotIn("slateframe_focusable_tablepress_tables", php)
        self.assertNotIn("add_filter( 'the_content', 'slateframe_focusable_", php)

    def test_core_keyboard_support_is_preserved(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        for block, callback in (
            ("table", "slateframe_focusable_table_block"),
            ("calendar", "slateframe_focusable_calendar_block"),
        ):
            with self.subTest(block=block):
                self.assertIn("function " + callback + "(", php)
                self.assertIn("add_filter( 'render_block_core/" + block + "', '" + callback + "' );", php)
        self.assertIn("get_attribute( 'tabindex' )", php)
        self.assertIn("set_attribute( 'tabindex', '0' )", php)

    def test_plain_table_and_core_table_have_bounded_overflow(self):
        css = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        self.assertIn(".slateframe-prose{& blockquote{", css)
        self.assertIn("&>table{display:block", css)
        # Core Table uses a figure wrapper. The shared figure bound plus
        # contained inline scrolling replace the redundant wrapper max width.
        self.assertIn(
            ".slateframe-prose{& :is(figure,audio,iframe,embed,object,.wp-video,.mejs-container){max-width:100%}",
            css,
        )
        self.assertIn(
            "& .wp-block-table{min-inline-size:0;overflow-x:auto;"
            "scrollbar-gutter:stable;contain:inline-size;overscroll-behavior-inline:contain;"
            "& table{inline-size:max-content;min-inline-size:100%;border-collapse:collapse}}",
            css,
        )
        self.assertIn(":is(.slateframe-prose>table,.slateframe-prose .wp-block-table table)", css)
        self.assertIn("outline:2px solid Highlight;outline-offset:-2px", css)
        self.assertLessEqual(len(css.encode("utf-8")), 7000)


if __name__ == "__main__":
    unittest.main()
