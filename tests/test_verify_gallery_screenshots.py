"""Regression tests for strict, exact-SHA Gallery screenshot evidence."""
import importlib.util
import os
from pathlib import Path
import shutil
import struct
import tempfile
import unittest
from unittest.mock import patch
import zlib

MODULE = Path(__file__).with_name('verify_gallery_screenshots.py')
spec = importlib.util.spec_from_file_location('gallery_screenshots', MODULE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)


def png(width=390, height=220, color=23):
    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    pixels = b''.join(b'\0' + b''.join(bytes(((color + x + y) % 256, (x * 7 + y) % 256, (x + y * 13) % 256)) for x in range(width)) for y in range(height))
    return gate.MAGIC + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b'')


class ScreenshotEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.workspace = Path(self.tmp.name)
        self.folder = self.workspace / gate.ROOT
        self.folder.mkdir(parents=True)
        self.path = self.folder / 'sample.png'
        self.path.write_bytes(png())
        self.cwd = Path.cwd()
        os.chdir(self.workspace)
        self.addCleanup(os.chdir, self.cwd)

    def test_valid_png(self):
        self.assertEqual(gate.inspect_png(self.path, 390)['width'], 390)

    def test_wrong_viewport(self):
        with self.assertRaisesRegex(ValueError, 'dimensions'):
            gate.inspect_png(self.path, 320)

    def test_crc_corruption(self):
        data = bytearray(self.path.read_bytes())
        data[35] ^= 1
        self.path.write_bytes(data)
        with self.assertRaisesRegex(ValueError, 'CRC'):
            gate.inspect_png(self.path, 390)

    def test_missing_iend(self):
        self.path.write_bytes(self.path.read_bytes()[:-12])
        with self.assertRaises(ValueError):
            gate.inspect_png(self.path, 390)

    def test_bad_png_signature(self):
        self.path.write_bytes(b'not png' * 200)
        with self.assertRaisesRegex(ValueError, 'signature'):
            gate.inspect_png(self.path, 390)

    def test_symlinked_png(self):
        linked = self.folder / 'linked.png'
        linked.symlink_to(self.path)
        with self.assertRaisesRegex(ValueError, 'linked'):
            gate.inspect_png(linked, 390)

    def test_symlinked_parent(self):
        (self.workspace / 'linked').symlink_to(self.folder, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'linked'):
            gate.inspect_png(self.workspace / 'linked/sample.png', 390)

    def test_hardlinked_png(self):
        other = self.folder / 'hard.png'
        os.link(self.path, other)
        with self.assertRaisesRegex(ValueError, 'hardlinked'):
            gate.inspect_png(self.path, 390)

    def test_outside_workspace(self):
        with self.assertRaisesRegex(ValueError, 'outside workspace'):
            gate.safe_path(self.workspace.parent / 'outside.png')

    def test_missing_png(self):
        self.path.unlink()
        with self.assertRaisesRegex(ValueError, 'missing'):
            gate.inspect_png(self.path, 390)

    def test_invalid_pixel_stream(self):
        header = struct.pack('>IIBBBBB', 390, 220, 8, 2, 0, 0, 0)
        self.path.write_bytes(gate.MAGIC + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(b'bad')) + chunk(b'tEXt', b'x' * 1500) + chunk(b'IEND', b''))
        with self.assertRaisesRegex(ValueError, 'pixels'):
            gate.inspect_png(self.path, 390)

    def test_missing_required_screenshot(self):
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'missing'):
                gate.verify()

    def make_all(self):
        self.path.unlink()
        for i, (name, width) in enumerate(gate.REQUIRED.items()):
            (self.folder / name).write_bytes(png(width, color=1 + i))

    def test_complete_manifest(self):
        self.make_all()
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            gate.verify()
        import json
        manifest = json.loads((self.folder / 'gallery-evidence-manifest.json').read_text())
        self.assertEqual(len(manifest['screenshots']), len(gate.REQUIRED))

    def test_duplicate_cross_scene_rejected(self):
        self.make_all()
        shutil.copyfile(self.folder / 'native-sequence-page-390.png', self.folder / 'class-only-sequence-390.png')
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'duplicate'):
                gate.verify()

    def test_reencoded_identical_pixels_rejected(self):
        self.make_all()
        source = (self.folder / 'native-sequence-page-390.png').read_bytes()
        ihdr_end = len(gate.MAGIC) + 25
        variant = source[:ihdr_end] + chunk(b'tEXt', b'capture=second') + source[ihdr_end:]
        (self.folder / 'class-only-sequence-390.png').write_bytes(variant)
        self.assertNotEqual(source, variant)
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'duplicate'):
                gate.verify()

    def test_allowed_same_page_capture(self):
        self.make_all()
        shutil.copyfile(self.folder / 'native-sequence-page-390.png', self.folder / 'photography-page-viewport-390.png')
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            gate.verify()

    def test_invalid_actions_sha(self):
        self.make_all()
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'SLATEFRAME_EVIDENCE_SHA': 'invalid'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'invalid evidence SHA'):
                gate.verify()

    def test_missing_actions_sha(self):
        self.make_all()
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'missing exact evidence SHA'):
                gate.verify()

    def test_stale_manifest_removed_before_missing_evidence(self):
        stale = self.folder / 'gallery-evidence-manifest.json'
        stale.write_text('old-pass')
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'missing'):
                gate.verify()
        self.assertFalse(stale.exists())

    def test_unknown_critical_chunk_rejected(self):
        data = self.path.read_bytes()
        offset = len(gate.MAGIC) + 25
        self.path.write_bytes(data[:offset] + chunk(b'ABCD', b'') + data[offset:])
        with self.assertRaisesRegex(ValueError, 'critical'):
            gate.inspect_png(self.path, 390)

    def test_invalid_reserved_chunk_bit_rejected(self):
        data = self.path.read_bytes()
        offset = len(gate.MAGIC) + 25
        self.path.write_bytes(data[:offset] + chunk(b'abcd', b'test') + data[offset:])
        with self.assertRaisesRegex(ValueError, 'reserved'):
            gate.inspect_png(self.path, 390)

    def test_palette_after_idat_rejected(self):
        data = self.path.read_bytes()
        offset = len(gate.MAGIC) + 25
        idat_size = struct.unpack_from('>I', data, offset)[0]
        end = offset + 12 + idat_size
        self.path.write_bytes(data[:end] + chunk(b'PLTE', b'\x01\x02\x03') + data[end:])
        with self.assertRaisesRegex(ValueError, 'palette placement'):
            gate.inspect_png(self.path, 390)

    def test_interlaced_png_rejected(self):
        data = self.path.read_bytes()
        header = struct.pack('>IIBBBBB', 390, 220, 8, 2, 0, 0, 1)
        self.path.write_bytes(gate.MAGIC + chunk(b'IHDR', header) + data[len(gate.MAGIC) + 25:])
        with self.assertRaisesRegex(ValueError, 'encoding'):
            gate.inspect_png(self.path, 390)

    def test_noncontiguous_idat_rejected(self):
        data = self.path.read_bytes()
        offset = len(gate.MAGIC) + 25
        idat_size = struct.unpack_from('>I', data, offset)[0]
        end = offset + 12 + idat_size
        self.path.write_bytes(data[:end] + chunk(b'tEXt', b'a') + chunk(b'IDAT', b'') + data[end:])
        with self.assertRaisesRegex(ValueError, 'noncontiguous'):
            gate.inspect_png(self.path, 390)

    def test_stale_manifest_removed_on_linked_extra_entry(self):
        stale = self.folder / 'gallery-evidence-manifest.json'
        stale.write_text('old-pass')
        (self.folder / 'external.png').symlink_to(self.path)
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'linked Gallery evidence entry'):
                gate.verify()
        self.assertFalse(stale.exists())

    def test_symlinked_manifest_rejected_before_deletion(self):
        outside = self.workspace / 'outside-manifest'
        outside.write_text('must-preserve')
        (self.folder / 'gallery-evidence-manifest.json').symlink_to(outside)
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'linked'):
                gate.verify()
        self.assertEqual(outside.read_text(), 'must-preserve')

    def test_mismatched_checkout_sha_rejected(self):
        self.make_all()
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true',
                                      'SLATEFRAME_EVIDENCE_SHA': 'a' * 40}, clear=True):
            with patch.object(gate.subprocess, 'check_output', return_value='b' * 40 + '\n'):
                with self.assertRaisesRegex(ValueError, 'differs from checkout'):
                    gate.verify()

    def test_dirty_checkout_rejected(self):
        self.make_all()
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true',
                                      'SLATEFRAME_EVIDENCE_SHA': 'a' * 40}, clear=True):
            with patch.object(gate.subprocess, 'check_output', side_effect=['a' * 40 + '\n', ' M style.css\n']):
                with self.assertRaisesRegex(ValueError, 'tracked checkout changed'):
                    gate.verify()

    def test_missing_actions_run_identity_rejected(self):
        self.make_all()
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true',
                                      'SLATEFRAME_EVIDENCE_SHA': 'a' * 40}, clear=True):
            with patch.object(gate.subprocess, 'check_output', side_effect=['a' * 40 + '\n', '']):
                with self.assertRaisesRegex(ValueError, 'missing GitHub Actions run identity'):
                    gate.verify()

    def test_unlinked_directory(self):
        outside = self.workspace / 'outside'
        outside.mkdir()
        shutil.rmtree(self.folder)
        self.folder.symlink_to(outside, target_is_directory=True)
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'linked'):
                gate.verify()


if __name__ == '__main__':
    unittest.main()
