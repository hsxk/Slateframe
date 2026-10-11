"""Keep Gutenberg photography captions readable and consistent in the editor."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "assets/css/photography.css"
EDITOR = ROOT / "assets/css/editor.css"


class PhotographyCaptionContractTest(unittest.TestCase):
    def test_core_gallery_caption_is_not_tiny_or_overlaid(self):
        css = FRONTEND.read_text(encoding="utf-8")
        selector = "figure.wp-block-image figcaption{"
        self.assertIn(selector, css)
        declaration = css.split(selector, 1)[1].split("}", 1)[0]
        for required in (
            "position:static", "overflow-wrap:anywhere",
            "font-size:.875rem", "line-height:1.55", "text-align:start",
        ):
            with self.subTest(required=required):
                self.assertIn(required, declaration)

    def test_feature_caption_uses_matching_readable_scale(self):
        css = FRONTEND.read_text(encoding="utf-8")
        selector = ".wp-block-image.is-style-slateframe-photo-feature{"
        self.assertIn(selector, css)
        feature = css.split(selector, 1)[1].split("}}", 1)[0]
        self.assertIn("font-size:.875rem", feature)
        self.assertIn("line-height:1.55", feature)
        self.assertIn("overflow-wrap:anywhere", feature)

    def test_editor_caption_matches_published_scale(self):
        editor = EDITOR.read_text(encoding="utf-8")
        selector = ".editor-styles-wrapper .wp-element-caption {"
        self.assertIn(selector, editor)
        declarations = editor.split(selector, 1)[1].split("}", 1)[0]
        self.assertIn("font-size: 0.875rem", declarations)
        self.assertIn("line-height: 1.55", declarations)


if __name__ == "__main__":
    unittest.main()
