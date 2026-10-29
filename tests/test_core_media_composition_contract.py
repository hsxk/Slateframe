"""Core-first media composition contracts."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreMediaCompositionContract(unittest.TestCase):
    def test_registration_and_editor_parity(self):
        source = (ROOT / "functions.php").read_text()
        self.assertIn("function slateframe_register_core_media_composition_styles()", source)
        self.assertIn("array( 'cover', 'media-text' )", source)
        self.assertIn("add_action( 'init', 'slateframe_register_core_media_composition_styles', 20 );", source)
        for block in ("cover", "media-text"):
            self.assertIn("'assets/css/core-" + block + ".css'", source)

    def test_scoped_css_without_core_layout_override(self):
        for block in ("cover", "media-text"):
            css = (ROOT / "assets/css" / ("core-" + block + ".css")).read_text()
            self.assertIn("max-inline-size:100%", css)
            self.assertIn("overflow-wrap:anywhere", css)
            self.assertLessEqual(len(css.encode()), 400)
            for forbidden in ("!important", "@import", "display:none", "object-fit", "grid-template"):
                self.assertNotIn(forbidden, css)
        self.assertIn("CanvasText", (ROOT / "assets/css/core-cover.css").read_text())

    def test_real_browser_evidence(self):
        js = (ROOT / "tests/browser/core-media-composition.spec.js").read_text()
        for term in ("[320, 375, 390, 412, 768, 1440, 1920]",
                     "['ltr', 'rtl']", "[16, 32, 64]", "getClientRects()",
                     "forcedColors: 'active'", "AxeBuilder", "openAuthenticatedEditor",
                     "core-cover-390-rtl-400-forced-colors.png",
                     "core-media-text-390-rtl-400-forced-colors.png",
                     "core/cover", "core/media-text"):
            with self.subTest(term=term):
                self.assertIn(term, js)


if __name__ == "__main__":
    unittest.main()
