"""Native Core Post Date presentation and runtime acceptance."""
from pathlib import Path
import unittest
import struct
import tempfile
import zlib

from verify_core_post_date_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]

class CorePostDateParity(unittest.TestCase):
    def test_conditional_editor_shared_style(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-post-date.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for token in ('function slateframe_register_core_post_date_styles()',
                      "'core/post-date',", "'handle' => 'slateframe-core-post-date'",
                      "'assets/css/core-post-date.css'",
                      "add_action( 'init', 'slateframe_register_core_post_date_styles', 20 );"):
            with self.subTest(token=token): self.assertIn(token, php)
        for token in ('.wp-block-post-date', '.wp-block-post-date time',
                      '.wp-block-post-date a', 'min-inline-size:0',
                      'max-inline-size:100%', 'font-variant-numeric:tabular-nums',
                      'overflow-wrap:anywhere', 'min-block-size:var(--slateframe-control)',
                      'min-inline-size:min(100%,var(--slateframe-control))'):
            with self.subTest(token=token): self.assertIn(token, css)
        self.assertIn('assets/css/core-post-date.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-post-date.css) -le 400', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 400)
        for bad in ('!important', 'time2log_', 'wpcode_', 'direction:ltr',
                    'display:none', 'javascript'): self.assertNotIn(bad, css)
        self.assertNotIn('render_block_core/post-date', php)

    def test_wordpress_and_editor_evidence(self):
        js = (ROOT / 'tests/browser/core-post-date-parity.spec.js').read_text(encoding='utf-8')
        for token in ("wp('post', 'create'", "wp('post', 'delete'", 'finally',
                      'get_permalink(', 'datetime', 'isLink', 'core/post-date',
                      '320, 375, 390, 412, 768, 1440, 1920', "'ltr', 'rtl'",
                      "await setRootTextScale(page, font, dir);", "forcedColors: 'active'",
                      'new AxeBuilder', 'openAuthenticatedEditor', 'blocks.serialize',
                      'blocks.parse', "page.keyboard.press('Tab')",
                      'core-post-date-390-rtl-200-forced-colors.png',
                      "page.goto('/?p=999999999'"):
            with self.subTest(token=token): self.assertIn(token, js)

    def test_computed_400_zoom_and_release_capture_contract(self):
        js = (ROOT / 'tests/browser/core-post-date-parity.spec.js').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        self.assertIn("require('./support/root-text-scale')", js)
        self.assertIn("await setRootTextScale(page, 32, 'rtl');", js)
        self.assertIn("await setRootTextScale(page, 64, 'rtl');", js)
        self.assertIn("fullPage: false", js)
        self.assertNotIn('style.fontSize', js)
        self.assertEqual(len(CAPTURES), 3)
        self.assertIn('python3 tests/verify_core_post_date_zoom_evidence.py', workflow)
        for name in CAPTURES:
            self.assertIn(name, workflow)
        self.assertIn("core-post-date-390-' + dir + '-400.png", js)
        self.assertIn('core-post-date-390-rtl-400-forced-colors.png', js)

    def test_400_zoom_capture_rejects_missing_corrupt_and_wrong_size(self):
        def header(width=390, height=900, corrupt=False):
            ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
            chunk = b'IHDR' + ihdr
            crc = zlib.crc32(chunk) & 0xFFFFFFFF
            if corrupt:
                crc ^= 1
            return b'\x89PNG\r\n\x1a\n' + struct.pack('>I', 13) + chunk + struct.pack('>I', crc)

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(header())
            verify(root)
            target = root / CAPTURES[-1]
            target.unlink()
            with self.assertRaises(FileNotFoundError):
                verify(root)
            target.write_bytes(header(width=320))
            with self.assertRaisesRegex(ValueError, '390x900'):
                verify(root)
            target.write_bytes(header(corrupt=True))
            with self.assertRaisesRegex(ValueError, 'corrupt IHDR'):
                verify(root)
            target.write_bytes(b'not a png')
            with self.assertRaisesRegex(ValueError, 'PNG signature'):
                verify(root)


if __name__ == '__main__':
    unittest.main()
