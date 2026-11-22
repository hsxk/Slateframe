"""Core Image linked-media containment and Gutenberg parity."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreImageParity(unittest.TestCase):
    def test_linked_media_and_caption_share_logical_containment(self):
        css = (ROOT / "assets/css/core-image.css").read_text(encoding="utf-8")
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        self.assertIn("function slateframe_register_core_image_styles()", php)
        self.assertIn("'assets/css/core-image.css'", php)
        self.assertIn("'assets/css/core-image.css'", php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        self.assertIn(".wp-block-image a{display:inline-block;max-inline-size:100%}", css)
        self.assertIn(".wp-block-image figcaption{min-inline-size:0;max-inline-size:100%;overflow-wrap:anywhere}", css)
        self.assertLessEqual(len(css.encode("utf-8")), 220)
        self.assertIn("test $(wc -c < assets/css/core-image.css) -le 220", ci)
        for forbidden in ("!important", "direction:ltr", "display:none", "time2log_", "javascript"):
            self.assertNotIn(forbidden, css)


if __name__ == "__main__":
    unittest.main()
