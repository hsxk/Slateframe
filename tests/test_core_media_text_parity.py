"""Guard Core Media & Text parity without widening static asset budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreMediaTextParity(unittest.TestCase):
    def test_shared_core_containment_does_not_override_core_grid(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        scope = ":is(.slateframe-prose,.editor-styles-wrapper) "
        for name in (".wp-block-media-text", ".wp-block-media-text__media", ".wp-block-media-text__content"):
            self.assertIn(scope + name + "{min-inline-size:0;", css)
        self.assertIn(".wp-block-media-text__content{min-inline-size:0;overflow-wrap:anywhere}", css)
        self.assertIn(".wp-block-media-text__media :is(img,video,iframe){max-inline-size:100%}", css)
        tail = css.split("/* Core Media & Text:", 1)[1]
        for override in ("grid-template-columns", "grid-column", "grid-row", "!important"):
            self.assertNotIn(override, tail)
        self.assertLessEqual((ROOT / "style.css").stat().st_size, 16000)

    def test_wordpress_browser_and_editor_evidence(self):
        spec = (ROOT / "tests/browser/core-media-text-parity.spec.js").read_text(encoding="utf-8")
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            self.assertIn(str(width), spec)
        for needle in ("'ltr', 'rtl'", "fontSize = '200%'", "forcedColors: 'active'",
                       "AxeBuilder", "openAuthenticatedEditor", "blocks.parse(first)",
                       "core-media-text-390-rtl-200-forced-colors.png", "has-media-on-the-right",
                       "is-stacked-on-mobile", "wp('post', 'delete'"):
            self.assertIn(needle, spec)


if __name__ == "__main__":
    unittest.main()
