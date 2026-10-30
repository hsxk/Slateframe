"""Guard bounded Core Project/Learning spacing and exact screenshot evidence."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_content_feature_spacing_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]

def chunk(kind, data):
    body = kind + data
    return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

def png(width=390, height=900):
    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    line = b'\0' + b'\0' * (width * 3)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(line * height)) + chunk(b'IEND', b'')

class CoreFeatureSpacingContract(unittest.TestCase):
    def test_bounded_presentation_preserves_core_patterns(self):
        css = (ROOT / 'assets/css/content-modes.css').read_text()
        self.assertIn('padding-block:min(clamp(1.75rem,4vw,3.25rem),64px);border-block:var(--slateframe-rule)', css)
        self.assertIn('padding-block:min(1.5rem,40px)}', css)
        self.assertNotIn('padding-block:1.5rem}', css)
        self.assertLessEqual(len(css.encode()), 7000)
        for path, name in [('patterns/project-case-study.php', 'project-feature'),
                           ('patterns/learning-path.php', 'learning-path')]:
            source = (ROOT / path).read_text()
            self.assertIn('is-style-slateframe-' + name, source)
            self.assertIn('wp:group', source)
            self.assertIn('wp:columns', source)
            self.assertNotIn('wp:html', source)

    def test_real_wordpress_matrix_editor_a11y_and_screenshots(self):
        spec = (ROOT / 'tests/browser/content-feature-spacing.spec.js').read_text()
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        for token in ('WP_Block_Patterns_Registry', 'openAuthenticatedEditor',
                      '[320,375,390,412,768,1440,1920]', "['ltr','rtl']",
                      '[16,32,64]', 'setRootTextScale', 'Math.min(font*1.5,40)',
                      'font*3.25', 'new AxeBuilder', "forcedColors:'active'",
                      'core/missing', '44px floor', '56px ceiling'):
            self.assertIn(token, spec)
        self.assertIn('python3 tests/verify_content_feature_spacing_evidence.py', workflow)
        for name in CAPTURES:
            self.assertIn(name, spec)

    def test_missing_corrupt_truncated_and_wrong_size_pngs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            verify(root)
            for name in CAPTURES:
                path = root / name
                path.unlink()
                with self.assertRaises(FileNotFoundError): verify(root)
                path.write_bytes(png(320))
                with self.assertRaisesRegex(ValueError, '390x900'): verify(root)
                path.write_bytes(png()[:-12])
                with self.assertRaisesRegex(ValueError, 'incomplete PNG'): verify(root)
                bad = bytearray(png()); bad[-20] ^= 1
                path.write_bytes(bad)
                with self.assertRaisesRegex(ValueError, 'corrupt PNG chunk'): verify(root)
                path.write_bytes(png())
            verify(root)

    def test_symlink_evidence_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            target = root / 'real.png'; target.write_bytes(png())
            path = root / CAPTURES[0]; path.unlink(); path.symlink_to(target)
            with self.assertRaisesRegex(ValueError, 'linked screenshot'): verify(root)

if __name__ == '__main__':
    unittest.main()
