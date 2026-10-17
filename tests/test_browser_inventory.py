"""Regression coverage for the complete Browser screenshot artifact gate."""
import hashlib
import json
import os
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import zlib

from verify_browser_inventory import MANIFEST, run

SHA = 'a' * 40


def chunk(kind, payload=b''):
    return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)


def png(width=390, height=24):
    raster = (b'\x00' + b'\x80\x80\x80' * width) * height
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raster)) + chunk(b'IEND')


class InventoryContract(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.files = []
        for profile in ('compact', 'default', 'spacious'):
            for width in (390, 1440):
                for surface in ('portfolio', 'photography', 'knowledge', 'post', 'home-controls', 'search-controls', 'page', 'photography-lightbox'):
                    name = f'appearance-{profile}-viewport-{width}-{surface}.png'
                    (self.root / name).write_bytes(png(width))
                    self.files.append(name)
        legacy = []
        for name in self.files[:18]:
            data = (self.root / name).read_bytes()
            legacy.append(dict(name=name, sha256=hashlib.sha256(data).hexdigest(), width=390 if '-390-' in name else 1440, height=24))
        (self.root / 'HEAD_SHA.txt').write_text(SHA + '\n')
        (self.root / 'VISUAL_EVIDENCE.json').write_text(json.dumps(dict(head_sha=SHA, files=legacy)))
        context = patch.dict(os.environ, {'SLATEFRAME_EVIDENCE_SHA': SHA, 'GITHUB_ACTIONS': 'false'}, clear=False)
        context.start()
        self.addCleanup(context.stop)

    def test_generate_verify_all_48(self):
        self.assertEqual(run('generate', self.root), 48)
        self.assertEqual(run('verify', self.root), 48)

    def test_rejects_missing_manifest(self):
        with self.assertRaises(ValueError):
            run('verify', self.root)

    def test_rejects_tampering(self):
        run('generate', self.root)
        (self.root / self.files[-1]).write_bytes(png(390))
        with self.assertRaises(ValueError):
            run('verify', self.root)

    def test_rejects_unexpected_file(self):
        (self.root / '.env').write_text('PRIVATE=1')
        with self.assertRaisesRegex(ValueError, 'non-screenshot'):
            run('generate', self.root)

    def test_rejects_symlink(self):
        (self.root / 'linked.png').symlink_to(self.root / self.files[0])
        with self.assertRaises(ValueError):
            run('generate', self.root)

    def test_rejects_hardlink(self):
        os.link(self.root / self.files[0], self.root / 'hardlink.png')
        with self.assertRaises(ValueError):
            run('generate', self.root)

    def test_rejects_wrong_fullpage_width(self):
        (self.root / self.files[0]).write_bytes(png(375))
        with self.assertRaisesRegex(ValueError, 'width mismatch'):
            run('generate', self.root)

    def test_accepts_element_crop(self):
        (self.root / 'appearance-compact-viewport-390-footnotes.png').write_bytes(png(288))
        self.assertEqual(run('generate', self.root), 49)

    def test_all_responsive_full_pages_enforce_real_viewport_width(self):
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            with self.subTest(width=width):
                name = self.root / f'viewport-{width}-page.png'
                name.write_bytes(png(width))
                self.assertEqual(run('generate', self.root), 49)
                name.write_bytes(png(width - 1))
                with self.assertRaisesRegex(ValueError, 'width mismatch'):
                    run('generate', self.root)
                name.unlink()

    def test_non_fullpage_crops_keep_their_actual_width(self):
        for name, width in (
            ('compact-nav-viewport-320-200-forced-colors.png', 288),
            ('gutenberg-viewport-1440-portfolio-first.png', 368),
            ('appearance-spacious-viewport-1440-content-pagination.png', 800),
        ):
            with self.subTest(name=name):
                path = self.root / name
                path.write_bytes(png(width))
                self.assertEqual(run('generate', self.root), 49)
                path.unlink()

    def test_rejects_legacy_hash_mismatch(self):
        data = json.loads((self.root / 'VISUAL_EVIDENCE.json').read_text())
        data['files'][0]['sha256'] = '0' * 64
        (self.root / 'VISUAL_EVIDENCE.json').write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'Legacy evidence'):
            run('generate', self.root)

    def test_rejects_run_identity_change(self):
        with patch.dict(os.environ, {'GITHUB_RUN_ID': '12', 'GITHUB_RUN_ATTEMPT': '1'}):
            run('generate', self.root)
        with patch.dict(os.environ, {'GITHUB_RUN_ID': '13', 'GITHUB_RUN_ATTEMPT': '1'}):
            with self.assertRaisesRegex(ValueError, 'stale'):
                run('verify', self.root)

    def test_clears_stale_on_failed_regeneration(self):
        run('generate', self.root)
        (self.root / 'unexpected.log').write_text('private')
        with self.assertRaises(ValueError):
            run('generate', self.root)
        self.assertFalse((self.root / MANIFEST).exists())

    def test_rejects_oversized_manifest(self):
        run('generate', self.root)
        (self.root / MANIFEST).write_bytes(b' ' * (1024 * 1024 + 1))
        with self.assertRaises(ValueError):
            run('verify', self.root)


if __name__ == '__main__':
    unittest.main()
