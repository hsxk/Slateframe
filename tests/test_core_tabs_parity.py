"""Guard WordPress 7.1 Core Tabs presentation without replacing Core interactivity."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreTabsParity(unittest.TestCase):
    def test_conditional_core_registration_and_editor_parity(self):
        source = (ROOT / "functions.php").read_text()
        self.assertIn("WP_Block_Type_Registry::get_instance()->is_registered( 'core/tabs' )", source)
        self.assertIn("'core/tabs',", source)
        self.assertIn("'handle' => 'slateframe-core-tabs'", source)
        self.assertIn("add_action( 'init', 'slateframe_register_core_tabs_styles', 20 );", source)
        self.assertIn("'assets/css/core-tabs.css',", source)

    def test_native_buttons_are_bounded_without_interactivity_takeover(self):
        css = (ROOT / "assets/css/core-tabs.css").read_text()
        for token in (".wp-block-tabs", ".wp-block-tab-list", ".wp-block-tab-panel",
                      "button[role=tab]", "min-inline-size:var(--slateframe-control)",
                      "min-block-size:var(--slateframe-control)", "max-inline-size:100%",
                      "overflow-wrap:anywhere", "white-space:normal", "forced-colors:active",
                      "[aria-selected=true]", "border-block-end:3px solid Highlight"):
            with self.subTest(token=token):
                self.assertIn(token, css)
        self.assertLessEqual(len(css.encode("utf-8")), 550)
        self.assertNotIn("display:none", css)
        self.assertNotIn("!important", css)
        self.assertNotIn("text-align:", css, "Core Tab authored alignment must win")
        self.assertNotIn("javascript", css.lower())

    def test_real_wordpress_browser_and_exact_evidence_gate(self):
        browser = (ROOT / "tests/browser/core-tabs-parity.spec.js").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        for token in ("for (const width of [320, 375, 390, 412, 768, 1440, 1920])",
                      "for (const dir of ['ltr', 'rtl'])", "for (const font of [16, 32, 64])",
                      "metrics.rootFont", "metrics.overflow", "toBeInViewport()",
                      "ArrowRight", "toBeFocused()", "AxeBuilder", "forcedColors"):
            self.assertIn(token, browser)
        for name in ("core-tabs-390-ltr-400.png", "core-tabs-390-rtl-400.png",
                     "core-tabs-390-rtl-400-forced-colors.png",
                     "core-tabs-390-rtl-400-selected-forced-colors.png"):
            self.assertIn(name, workflow)
            self.assertIn(name, workflow)
        self.assertIn("python3 tests/verify_core_tabs_zoom_evidence.py", workflow)


if __name__ == "__main__":
    unittest.main()
