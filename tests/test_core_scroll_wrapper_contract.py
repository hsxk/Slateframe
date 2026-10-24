"""Protect Core-only focus wrappers and plugin-neutral file targets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreScrollWrapperContract(unittest.TestCase):
    def test_native_tags_only(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        table = php.split("function slateframe_focusable_table_block(", 1)[1].split("add_filter(", 1)[0]
        calendar = php.split("function slateframe_focusable_calendar_block(", 1)[1].split("add_filter(", 1)[0]
        self.assertIn("next_tag( array( 'tag_name' => 'FIGURE' ) )", table)
        self.assertIn("next_tag( array( 'tag_name' => 'DIV' ) )", calendar)
        for body in (table, calendar):
            self.assertIn("get_attribute( 'tabindex' )", body)
            self.assertIn("set_attribute( 'tabindex', '0' )", body)

    def test_native_file_target_has_bounded_height(self):
        css = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        self.assertIn("a.wp-block-file__button{display:inline-flex;align-items:center;min-height:var(--slateframe-control)", css)
        browser = (ROOT / "tests/browser/core-file-verse.spec.js").read_text(encoding="utf-8")
        self.assertIn("m.download.minHeight", browser)
        self.assertIn("m.download.height, width + 'px ' + dir).toBeGreaterThanOrEqual(44)", browser)

    def test_plugin_table_does_not_get_theme_tabindex(self):
        browser = (ROOT / "tests/browser/design-system.spec.js").read_text(encoding="utf-8")
        self.assertIn("expect(await table.getAttribute('tabindex')).toBeNull()", browser)
        self.assertNotIn("await expect(table).toHaveAttribute('tabindex', '0')", browser)


if __name__ == "__main__":
    unittest.main()
