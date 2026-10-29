"""Guard native Core Accordion presentation, compatibility and evidence."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class CoreAccordionParity(unittest.TestCase):
    def test_registration_is_core_conditional(self):
        source = (ROOT / "functions.php").read_text()
        self.assertIn("function slateframe_register_core_accordion_styles()", source)
        self.assertIn("is_registered( 'core/accordion' )", source)
        self.assertIn("'handle' => 'slateframe-core-accordion'", source)
        self.assertIn("add_action( 'init', 'slateframe_register_core_accordion_styles', 20 );", source)

    def test_editor_uses_same_asset(self):
        source = (ROOT / "functions.php").read_text()
        self.assertIn("'assets/css/core-accordion.css', 'assets/css/core-post-navigation.css'", source)

    def test_control_size_and_multilingual_reflow(self):
        css = (ROOT / "assets/css/core-accordion.css").read_text()
        self.assertIn("min-block-size:var(--slateframe-control)", css)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertIn("max-inline-size:100%", css)
        self.assertNotIn("text-align:", css)
        self.assertLessEqual(len(css.encode()), 800)

    def test_forced_colors_and_print_state(self):
        css = (ROOT / "assets/css/core-accordion.css").read_text()
        for token in ("forced-colors:active", "outline:2px solid Highlight",
                      "@media print", ".wp-block-accordion-panel:is([inert],[hidden])",
                      "display:block!important", "content-visibility:visible!important"):
            self.assertIn(token, css)

    def test_exact_head_browser_evidence(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        browser = (ROOT / "tests/browser/core-accordion-parity.spec.js").read_text()
        verifier = (ROOT / "tests/verify_core_accordion_zoom_evidence.py").read_text()
        self.assertIn("test $(wc -c < assets/css/core-accordion.css) -le 800", workflow)
        self.assertIn("python3 tests/verify_core_accordion_zoom_evidence.py", workflow)
        for name in ("core-accordion-390-ltr-400.png", "core-accordion-390-rtl-400.png",
                     "core-accordion-390-rtl-400-forced-colors.png",
                     "core-accordion-print-390-rtl-400.png"):
            self.assertIn(name, verifier)
        self.assertIn("'test-artifacts/screenshots/core-accordion-390-' + dir + '-400.png'", browser)
        self.assertIn("['ltr', 'rtl']", browser)
        for name in ("core-accordion-390-rtl-400-forced-colors.png",
                     "core-accordion-print-390-rtl-400.png"):
            self.assertIn(name, browser)

    def test_real_wordpress_and_editor_contracts(self):
        browser = (ROOT / "tests/browser/core-accordion-parity.spec.js").read_text()
        for token in ("[320, 375, 390, 412, 768, 1440, 1920]",
                      "['ltr', 'rtl']", "[16, 32, 64]", "AxeBuilder",
                      "aria-expanded", "openAuthenticatedEditor", "blocks.serialize",
                      "media: 'print'", "media: 'screen'"):
            self.assertIn(token, browser)

if __name__ == "__main__":
    unittest.main()
