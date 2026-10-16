"""Class-only Core Gallery must opt in to the same bounded Photography CSS."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class ClassOnlyGalleryAssets(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.php = (ROOT / 'functions.php').read_text()
        cls.css = (ROOT / 'assets/css/photography.css').read_text()
        cls.editor = (ROOT / 'assets/css/editor.css').read_text()

    def test_exact_class_marker(self):
        markers = self.php.split('function slateframe_photography_marker_classes()', 1)[1].split(');', 1)[0]
        self.assertIn("'slateframe-gallery-sequence'", markers)

    def test_registered_block_style_remains_supported(self):
        self.assertIn("'is-style-slateframe-photo-sequence'", self.php)
        self.assertIn("'slateframe-photography-sequence'", self.php)

    def test_bounded_images_share_selector(self):
        self.assertIn('.is-style-slateframe-photo-sequence,.slateframe-gallery-sequence){min-inline-size:0;max-inline-size:100%;gap:', self.css)
        self.assertIn('gap:var(--slateframe-media-gap);& .wp-block-image img{', self.css)
        self.assertIn('max-block-size:min(62dvh,42rem)', self.css)
        self.assertIn('aspect-ratio:auto', self.css)
        self.assertIn('object-fit:contain', self.css)

    def test_editor_caption_parity(self):
        self.assertIn('&.has-nested-images figure.wp-block-image figcaption{', self.css)
        self.assertIn('overflow-wrap:anywhere', self.css)
        self.assertIn('.slateframe-gallery-sequence) .wp-block-image figcaption', self.editor)

    def test_no_theme_boundary_regression(self):
        for source in (self.php, self.css, self.editor):
            self.assertNotIn('time2log_', source)
            self.assertNotIn('wpcode_', source)
            self.assertNotIn('license_key', source)

if __name__ == '__main__':
    unittest.main()
