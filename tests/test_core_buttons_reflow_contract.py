"""Core Buttons remain portable, bounded, keyboard-accessible, and editor-native."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreButtonsReflowContract(unittest.TestCase):
    def test_shared_styles_are_scoped_and_do_not_override_core_layout(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        block_css = (ROOT / "assets/css/core-buttons.css").read_text(encoding="utf-8")
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn(".wp-block-buttons>.wp-block-button{min-inline-size:0}", css)
        self.assertIn(".wp-block-buttons.is-nowrap>.wp-block-button:not(.has-custom-width){min-inline-size:auto;flex-shrink:1}", css)
        self.assertNotIn("html{scroll-behavior:smooth}", css)
        self.assertIn("--slateframe-control-padding-inline:12px", css)
        self.assertIn("background:ButtonFace!important;color:ButtonText!important;border-color:ButtonText!important", block_css)
        self.assertIn("&:focus-visible{outline-color:Highlight}", block_css)
        self.assertIn("@media(max-width:480px){.is-nowrap>.wp-block-button:not(.has-custom-width){flex:1 1 0}}", block_css)
        self.assertIn(".is-nowrap:has(>:nth-child(2):last-child):not(:has(>.has-custom-width))>.wp-block-button{min-inline-size:min(8rem,35%)}", block_css)
        self.assertNotIn("background:ButtonFace!important", css)
        self.assertLessEqual(len(block_css.encode("utf-8")), 400)
        self.assertIn("wp_enqueue_block_style(", php)
        self.assertIn("'core/button'", php)
        self.assertIn("'slateframe-core-buttons'", php)
        self.assertIn("'assets/css/core-buttons.css'", php)
        self.assertIn(".wp-block-button__link{min-inline-size:var(--slateframe-control)", css)
        self.assertIn("max-width:100%", css)
        self.assertIn("overflow-wrap:anywhere", css)
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
                       "core-buttons-320-rtl-200-forced-colors.png", "balanced actions", "primary readable width", "desktop readable width", "custom width bypass", "core-buttons.css"):
            self.assertIn(needle, js)


if __name__ == '__main__':
    unittest.main()
