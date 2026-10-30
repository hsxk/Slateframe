"""Guard Core Footnotes conditional presentation and exact browser evidence."""
from pathlib import Path
import tempfile
import unittest
from test_content_feature_spacing import png
from verify_core_footnotes_zoom_evidence import CAPTURES, verify
ROOT = Path(__file__).resolve().parents[1]

class CoreFootnotesZoomContract(unittest.TestCase):
    def test_native_core_registration_and_bounded_css(self):
        php=(ROOT/'functions.php').read_text()
        reading=(ROOT/'assets/css/reading.css').read_text()
        css=(ROOT/'assets/css/core-footnotes.css').read_text()
        for token in ("'core/footnotes'", "'assets/css/core-footnotes.css'", 'wp_enqueue_block_style(', 'slateframe_register_core_footnotes_styles'):
            self.assertIn(token,php)
        for token in ('padding-inline-start:min(1.35em,32px)','margin-block:min(.6rem,20px)','li>a[href$="-link"]','min-block-size:var(--slateframe-control)',':focus-visible'):
            self.assertIn(token,css)
        self.assertNotIn('& .wp-block-footnotes{padding-inline-start:1.35rem',reading)
        self.assertLessEqual(len(reading.encode()),7000)
        self.assertLessEqual(len(css.encode()),900)
        self.assertIn('@media screen{',css)

    def test_real_wordpress_matrix_and_gutenberg(self):
        spec=(ROOT/'tests/browser/core-footnotes-zoom.spec.js').read_text()
        workflow=(ROOT/'.github/workflows/quality.yml').read_text()
        for token in ("'--post_content='+content", "'footnotes'", "'core/footnotes'",'openAuthenticatedEditor','data-fn=', '[320,375,390,412,768,1440,1920]',"['ltr','rtl']",'[16,32,64]','setRootTextScale','new AxeBuilder',"forcedColors:'active'",'core/missing'):
            self.assertIn(token,spec)
        for name in CAPTURES:
            self.assertIn(name,spec)
        self.assertIn('python3 tests/verify_core_footnotes_zoom_evidence.py',workflow)

    def test_png_rejects_missing_wrong_size_corruption_truncation_and_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for name,(w,h) in CAPTURES.items():
                (root/name).write_bytes(png(w,h))
            verify(root)
            target=root/next(iter(CAPTURES))
            target.unlink()
            with self.assertRaises(FileNotFoundError):verify(root)
            target.write_bytes(png(320))
            with self.assertRaisesRegex(ValueError,'390x900'):verify(root)
            target.write_bytes(png()[:-12])
            with self.assertRaisesRegex(ValueError,'incomplete PNG'):verify(root)
            bad=bytearray(png());bad[-20]^=1
            target.write_bytes(bad)
            with self.assertRaisesRegex(ValueError,'corrupt PNG chunk'):verify(root)
            target.unlink()
            (root/'real.png').write_bytes(png())
            target.symlink_to(root/'real.png')
            with self.assertRaisesRegex(ValueError,'linked screenshot'):verify(root)
