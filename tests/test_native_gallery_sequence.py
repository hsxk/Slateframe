"""Regression tests for independent Core Gallery photo sequences."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class PhotoSequenceContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.photo = (ROOT / "assets/css/photography.css").read_text()
        cls.editor = (ROOT / "assets/css/editor.css").read_text()
        cls.readme = (ROOT / "readme.txt").read_text()
        cls.style = (ROOT / "style.css").read_text()

    def test_core_gallery_and_pattern_share_grid(self):
        self.assertIn(".wp-block-gallery:is(.is-style-slateframe-photo-sequence,.slateframe-gallery-sequence){display:grid!important;", self.photo)
        self.assertIn("grid-template-columns:repeat(2,minmax(0,1fr))", self.photo)

    def test_mobile_grid_and_first_image_span(self):
        self.assertIn("@media (max-width:640px){.wp-block-gallery:is(.is-style-slateframe-photo-sequence,.slateframe-gallery-sequence)", self.photo)
        self.assertIn("grid-column:1/-1", self.photo)
        self.assertIn("grid-column:auto", self.photo)

    def test_images_preserve_proportions(self):
        self.assertIn("aspect-ratio:auto!important;object-fit:contain!important;flex:none!important", self.photo)

    def test_captions_are_not_overlay_text(self):
        self.assertIn("text-shadow:none;font-weight:400", self.photo)
        self.assertIn("text-shadow: none;", self.editor)
        self.assertIn("font-weight: 400;", self.editor)

    def test_reduced_motion_and_touch(self):
        self.assertIn("@media(hover:hover){.slateframe-card-media:hover img", self.style)
        self.assertIn(".slateframe-card-media:hover img{transform:none}", self.style)

    def test_public_usage_documentation(self):
        self.assertIn("Can I use the Photo sequence style", self.readme)

    def test_no_legacy_prefixes(self):
        for source in (self.photo, self.editor, self.style):
            self.assertNotIn("time2log_", source)
            self.assertNotIn("wpcode_", source)

if __name__ == "__main__":
    unittest.main()
