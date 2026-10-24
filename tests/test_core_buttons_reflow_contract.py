"""Core Buttons remain portable, bounded, keyboard-accessible, and editor-native."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreButtonsReflowContract(unittest.TestCase):
    def test_shared_styles_are_scoped_and_do_not_override_core_layout(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        scope = ":is(.slateframe-prose,.editor-styles-wrapper) .wp-block-buttons"
        self.assertIn(scope + "{min-inline-size:0;max-inline-size:100%}", css)
        self.assertIn(scope + ">.wp-block-button{min-inline-size:0;max-inline-size:100%;flex-shrink:1}", css)
        self.assertIn(scope + " .wp-block-button__link{max-inline-size:100%;white-space:normal;overflow-wrap:anywhere}", css)
        self.assertNotIn(".wp-block-buttons{flex-wrap:wrap!important}", css)
        self.assertNotIn(".wp-block-buttons{display:grid!important}", css)
        self.assertLessEqual((ROOT / "style.css").stat().st_size, 16000)

    def test_real_wordpress_and_editor_contract(self):
        js = (ROOT / "tests/browser/core-buttons-reflow.spec.js").read_text(encoding="utf-8")
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            self.assertIn(str(width), js)
        for needle in ("'ltr', 'rtl'", "'200%', '400%'", "forcedColors: 'active'",
                       "AxeBuilder", "openAuthenticatedEditor", "blocks.parse(serialized)",
                       "wp('post', 'delete'", "is-nowrap", "is-vertical", "43",
                       "core-buttons-320-rtl-200-forced-colors.png"):
            self.assertIn(needle, js)


if __name__ == '__main__':
    unittest.main()
