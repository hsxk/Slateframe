"""Core-owned embeds stay responsive without custom providers or players."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreEmbedParity(unittest.TestCase):
    def test_scoped_styles_and_editor_parity(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-embed.css").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for needle in ("function slateframe_register_core_embed_styles()",
                       "'core/embed',", "'handle' => 'slateframe-core-embed'",
                       "add_action( 'init', 'slateframe_register_core_embed_styles', 20 );",
                       "'assets/css/core-embed.css'"):
            self.assertIn(needle, php)
        self.assertIn("assets/css/core-embed.css", workflow)
        self.assertIn("test $(wc -c < assets/css/core-embed.css) -le 350", workflow)
        for needle in (".wp-block-embed__wrapper", ".wp-block-embed iframe",
                       ".wp-block-embed figcaption", "min-inline-size:0",
                       "max-inline-size:100%", "overflow-wrap:anywhere", "text-align:start"):
            self.assertIn(needle, css)
        self.assertLessEqual(len(css.encode("utf-8")), 350)
        for forbidden in ("!important", "aspect-ratio:", "javascript", "time2log_", "wpcode_"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/embed", php)

    def test_wordpress_and_gutenberg_evidence(self):
        spec = (ROOT / "tests/browser/core-embed-parity.spec.js").read_text(encoding="utf-8")
        for needle in ("wp('post', 'create'", "wp('post', 'delete'", "finally",
                       "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
                       "fontSize = '400%'", "forcedColors: 'active'",
                       "new AxeBuilder", "page.keyboard.press('Tab')",
                       "core-embed-390-rtl-200-forced-colors.png",
                       "'slateframe-core-embed-inline-css'", "external.sheet",
                       "openAuthenticatedEditor", "blocks.serialize", "blocks.parse",
                       "about:blank", "figcaption", "page.goto('/?p=999999999'"):
            with self.subTest(needle=needle):
                self.assertIn(needle, spec)


if __name__ == "__main__":
    unittest.main()
