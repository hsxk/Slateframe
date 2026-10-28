"""Offline visual-review index must verify exact GitHub evidence before display."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

MODULE_PATH = Path(__file__).resolve().parents[1] / 'bin/visual-review-index.py'
spec = importlib.util.spec_from_file_location('slateframe_visual_review', MODULE_PATH)
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)
HEAD = 'a' * 40


def chunk(kind, data):
    payload = kind + data
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xffffffff)


def png(width=390, height=900):
    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    scanline = b'\0' + b'\0' * (width * 3)
    return review.SIGNATURE + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(scanline * height)) + chunk(b'IEND', b'')


class VisualReviewIndex(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'screenshots'
        self.root.mkdir()
        self.names = ['appearance-compact-390.png', 'appearance-default-1440.png',
                      'appearance-spacious-390.png', 'knowledge-faq-390-rtl-400.png',
                      'core-post-featured-image-390-ltr-400.png', 'footer-390.png']
        self.write_fixture()

    def write_fixture(self):
        files = []
        for name in self.names:
            data = png()
            (self.root / name).write_bytes(data)
            files.append({'name': name, 'width': 390, 'height': 900,
                          'sha256': hashlib.sha256(data).hexdigest()})
        (self.root / 'HEAD_SHA.txt').write_text(HEAD + '\n')
        (self.root / 'VISUAL_EVIDENCE.json').write_text(json.dumps({
            'schema_version': 1, 'head_sha': HEAD, 'files': files[:3]
        }))
        (self.root / 'BROWSER_SCREENSHOT_INVENTORY.json').write_text(json.dumps({
            'schema_version': 1, 'head_sha': HEAD, 'run_id': '123', 'run_attempt': '1',
            'screenshots': {item['name']: {**item, 'bytes': len(png())} for item in files}
        }))

    def test_real_manifest_is_verified_and_grouped(self):
        entries = review.load_evidence(self.root, HEAD)
        self.assertEqual(len(entries), 6)
        page = review.render(HEAD, entries, 24, 'screenshots/')
        for label in ('Appearance / compact', 'Appearance / default', 'Appearance / spacious', 'Knowledge', 'Article / Core media', 'Footer'):
            self.assertIn(label, page)
        self.assertIn('href="screenshots/appearance-compact-390.png"', page)
        self.assertIn('loading="lazy"', page)
        self.assertIn('exact HEAD ' + HEAD, page)

    def test_limit_and_all_images_remain_untouched(self):
        entries = review.load_evidence(self.root, HEAD)
        page = review.render(HEAD, entries, 1)
        self.assertIn('1 of 1 verified screenshots shown', page)
        self.assertEqual(len(list(self.root.glob('*.png'))), 6)
        with self.assertRaises(ValueError):
            review.render(HEAD, entries, 0)

    def test_mismatched_head_and_invalid_head_are_rejected(self):
        for head in ('b' * 40, 'A' * 40, 'abc'):
            with self.assertRaises(ValueError):
                review.load_evidence(self.root, head)
        (self.root / 'HEAD_SHA.txt').write_text('b' * 40)
        with self.assertRaises(ValueError):
            review.load_evidence(self.root, HEAD)

    def test_manifest_sha_mismatch_rejected(self):
        manifest = self.root / 'VISUAL_EVIDENCE.json'
        data = json.loads(manifest.read_text())
        data['head_sha'] = 'b' * 40
        manifest.write_text(json.dumps(data))
        with self.assertRaises(ValueError):
            review.load_evidence(self.root, HEAD)

    def test_missing_corrupt_and_wrong_dimension_are_rejected(self):
        path = self.root / self.names[0]
        for invalid in (None, b'not png', png(320), png()[:-12]):
            if invalid is None:
                path.unlink()
            else:
                path.write_bytes(invalid)
            with self.assertRaises((OSError, ValueError)):
                review.load_evidence(self.root, HEAD)
        self.write_fixture()
        damaged = bytearray(path.read_bytes())
        damaged[-20] ^= 1
        path.write_bytes(damaged)
        with self.assertRaises(ValueError):
            review.load_evidence(self.root, HEAD)

    def test_duplicate_and_traversal_names_rejected(self):
        manifest = self.root / 'BROWSER_SCREENSHOT_INVENTORY.json'
        data = json.loads(manifest.read_text())
        for bad in ('../secret.png', 'foo/bar.png', '<img>.png', 'a\\b.png', self.names[0]):
            modified = json.loads(json.dumps(data))
            modified['screenshots'][self.names[1]]['name'] = bad
            manifest.write_text(json.dumps(modified))
            with self.assertRaises(ValueError):
                review.load_evidence(self.root, HEAD)

    def test_symlinked_image_and_directory_rejected(self):
        target = self.root / self.names[0]
        link = self.root / self.names[1]
        link.unlink()
        link.symlink_to(target)
        with self.assertRaisesRegex(ValueError, 'linked'):
            review.load_evidence(self.root, HEAD)
        link.unlink()
        self.write_fixture()
        alias = self.root.parent / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'linked'):
            review.load_evidence(alias, HEAD)

    def test_hardlinked_image_rejected(self):
        target = self.root / self.names[0]
        alias = self.root.parent / 'hardlink.png'
        alias.hardlink_to(target)
        with self.assertRaisesRegex(ValueError, 'unsafe evidence'):
            review.load_evidence(self.root, HEAD)

    def test_manifest_digest_tampering_rejected(self):
        manifest = self.root / 'BROWSER_SCREENSHOT_INVENTORY.json'
        data = json.loads(manifest.read_text())
        data['screenshots'][self.names[-1]]['sha256'] = '0' * 64
        manifest.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'digest mismatch'):
            review.load_evidence(self.root, HEAD)

    def test_full_page_long_capture_is_supported_without_unbounded_pixels(self):
        self.assertEqual(review.png_dimensions(png(390, 22358)), (390, 22358))
        with self.assertRaises(ValueError):
            review.png_dimensions(png(390, 50001))

    def test_unlisted_png_is_rejected(self):
        (self.root / 'unlisted.png').write_bytes(png())
        with self.assertRaisesRegex(ValueError, 'unexpected screenshot artifact'):
            review.load_evidence(self.root, HEAD)

    def test_browser_inventory_byte_length_is_enforced(self):
        manifest = self.root / 'BROWSER_SCREENSHOT_INVENTORY.json'
        data = json.loads(manifest.read_text())
        data['screenshots'][self.names[-1]]['bytes'] = 1
        manifest.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'size mismatch'):
            review.load_evidence(self.root, HEAD)

    def test_visual_subset_disagreement_is_rejected(self):
        manifest = self.root / 'VISUAL_EVIDENCE.json'
        data = json.loads(manifest.read_text())
        data['files'][0]['width'] = 999
        manifest.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'disagrees'):
            review.load_evidence(self.root, HEAD)

    def test_offline_index_has_no_script_or_remote_images(self):
        page = review.render(HEAD, review.load_evidence(self.root, HEAD), asset_prefix='screenshots/')
        self.assertNotIn('<script', page)
        self.assertNotIn('http://', page)
        self.assertNotIn('https://', page)
        self.assertIn('loading="lazy"', page)

    def test_duplicate_json_keys_and_nonfinite_constants_rejected(self):
        inventory = self.root / 'BROWSER_SCREENSHOT_INVENTORY.json'
        original = inventory.read_text()
        inventory.write_text(original.replace('"head_sha":', '"head_sha": "' + 'b' * 40 + '", "head_sha":', 1))
        with self.assertRaisesRegex(ValueError, 'duplicate JSON key'):
            review.load_evidence(self.root, HEAD)
        inventory.write_text(original[:-1] + ', "unsafe": NaN}')
        with self.assertRaisesRegex(ValueError, 'invalid JSON constant'):
            review.load_evidence(self.root, HEAD)

    def test_inventory_name_override_and_boolean_schema_rejected(self):
        inventory = self.root / 'BROWSER_SCREENSHOT_INVENTORY.json'
        data = json.loads(inventory.read_text())
        data['screenshots'][self.names[0]]['name'] = self.names[1]
        inventory.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'invalid browser inventory record'):
            review.load_evidence(self.root, HEAD)
        data['screenshots'][self.names[0]]['name'] = self.names[0]
        data['schema_version'] = True
        inventory.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'browser inventory'):
            review.load_evidence(self.root, HEAD)

    def test_duplicate_and_invalid_visual_subset_records_rejected(self):
        visual = self.root / 'VISUAL_EVIDENCE.json'
        data = json.loads(visual.read_text())
        data['files'].append(data['files'][0])
        visual.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'duplicate visual evidence'):
            review.load_evidence(self.root, HEAD)
        data['files'][-1]['name'] = ['unhashable']
        visual.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'visual evidence not present'):
            review.load_evidence(self.root, HEAD)

    def test_index_links_to_all_verified_images_even_with_thumbnail_limit(self):
        self.names.append('appearance-compact-1440.png')
        self.write_fixture()
        page = review.render(HEAD, review.load_evidence(self.root, HEAD), 1, 'screenshots/')
        self.assertIn('Browse remaining 1 verified screenshots', page)
        self.assertIn('href="screenshots/appearance-compact-1440.png"', page)
        self.assertIn('<details>', page)
        self.assertNotIn('<script', page)

    def test_png_critical_chunk_order_and_ihdr_validation(self):
        raw = png()
        ihdr_end = len(review.SIGNATURE) + 25
        ihdr = raw[len(review.SIGNATURE):ihdr_end]
        idat_end = len(raw) - len(chunk(b'IEND', b''))
        idat = raw[ihdr_end:idat_end]
        iend = chunk(b'IEND', b'')
        invalid_header = chunk(b'IHDR', struct.pack('>IIBBBBB', 390, 900, 4, 2, 0, 0, 0))
        for bad in (
            review.SIGNATURE + ihdr + chunk(b'ABCD', b'') + idat + iend,
            review.SIGNATURE + ihdr + idat + chunk(b'PLTE', b'\\x00\\x00\\x00') + iend,
            review.SIGNATURE + ihdr + idat + chunk(b'tEXt', b'k\\x00v') + idat + iend,
            review.SIGNATURE + invalid_header + idat + iend,
            review.SIGNATURE + ihdr + chunk(b'IDAT', b'') + iend,
            review.SIGNATURE + ihdr + chunk(b'IDAT', b'') + chunk(b'tEXt', b'k') + idat + iend,
        ):
            with self.subTest(size=len(bad)), self.assertRaises(ValueError):
                review.png_dimensions(bad)

    def test_png_trailing_data_and_bad_crc_rejected(self):
        for data in (png() + b'junk', png()[:-4] + b'bad!'):
            with self.assertRaises(ValueError):
                review.png_dimensions(data)


if __name__ == '__main__':
    unittest.main()
