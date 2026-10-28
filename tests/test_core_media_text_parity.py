"""Guard Core Media & Text parity without widening static asset budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreMediaTextParity(unittest.TestCase):
    def test_core_grid_shrink_is_shared_without_overriding_wordpress(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn(".wp-block-media-text>*{min-inline-size:0}", css)
        self.assertEqual(css.count(".wp-block-media-text>*{min-inline-size:0}"), 1)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertIn("*{box-sizing:border-box}", css)
        self.assertIn("scroll-behavior:auto !important", css)
        photo = (ROOT / "assets/css/photography.css").read_text(encoding="utf-8")
        self.assertNotIn("box-sizing:border-box", photo)
        self.assertNotIn("scroll-behavior:auto!important", photo)
        self.assertIn("img,svg,video{display:block;max-width:100%;height:auto}", css)
        self.assertIn("overflow-wrap: anywhere;", (ROOT / "assets/css/editor.css").read_text())
        self.assertIn(".slateframe-prose :is(figure,audio,iframe,embed,object,.wp-video,.mejs-container){max-width:100%}", (ROOT / "assets/css/reading.css").read_text())
        self.assertLessEqual((ROOT / "style.css").stat().st_size, 16000)
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        media = (ROOT / "assets/css/core-media-text.css").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for needle in ("function slateframe_register_core_media_text_styles()",
                       "'core/media-text',", "'handle' => 'slateframe-core-media-text'",
                       "'assets/css/core-media-text.css'",
                       "add_action( 'init', 'slateframe_register_core_media_text_styles', 20 );"):
            self.assertIn(needle, php)
        for needle in (".wp-block-media-text", ".wp-block-media-text__media",
                       ".wp-block-media-text__content", "min-inline-size:0",
                       "max-inline-size:100%", "overflow-wrap:anywhere"):
            self.assertIn(needle, media)
        self.assertLessEqual(len(media.encode("utf-8")), 400)
        self.assertIn("test $(wc -c < assets/css/core-media-text.css) -le 400", workflow)
        for forbidden in ("!important", "display:none", "grid-template", "object-fit",
                          "time2log_", "time2analyze", "javascript", "direction:ltr"):
            self.assertNotIn(forbidden, media)
        self.assertNotIn("render_block_core/media-text", php)

    def test_wordpress_browser_and_editor_evidence(self):
        spec = (ROOT / "tests/browser/core-media-text-parity.spec.js").read_text(encoding="utf-8")
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            self.assertIn(str(width), spec)
        for needle in ("'ltr', 'rtl'", "for (const font of [16, 32, 64])",
                       "setRootTextScale(page, font, dir)", "data.rootFont",
                       "core-media-text-390-rtl-400-forced-colors.png", "forcedColors: 'active'",
                       "AxeBuilder", "openAuthenticatedEditor", "blocks.parse(first)",
                       "core-media-text-390-rtl-200-forced-colors.png", "has-media-on-the-right",
                       "is-stacked-on-mobile", "wp('post', 'delete'"):
            self.assertIn(needle, spec)


if __name__ == "__main__":
    unittest.main()
