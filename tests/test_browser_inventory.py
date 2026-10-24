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

from verify_browser_inventory import MANIFEST, REQUIRED_FAQ, REQUIRED_SCREENSHOTS, run

SHA = 'a' * 40


def chunk(kind, payload=b''):
    return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)


def png(width=390, height=24, compression=6):
    raster = (b'\x00' + b'\x80\x80\x80' * width) * height
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raster, compression)) + chunk(b'IEND')


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
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            name = f'viewport-{width}-page.png'
            (self.root / name).write_bytes(png(width))
            self.files.append(name)
        # The FAQ inventory now requires nine real editor/axe captures. The
        # synthetic fixtures must evolve with that contract rather than leave
        # the original 55-image tests permanently red after the stronger gate.
        for name in sorted(REQUIRED_FAQ):
            width = 1440 if '-1440-' in name else 390
            height = (80 if 'final-paragraph' in name else
                      44 if 'keyboard-focus' in name else
                      80 if name.endswith('-expanded.png') else 24)
            (self.root / name).write_bytes(png(width, height))
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

    def test_generate_verify_all_required_64(self):
        self.assertEqual(len(REQUIRED_SCREENSHOTS), 64)
        self.assertEqual(len(REQUIRED_FAQ), 9)
        self.assertEqual(run('generate', self.root), 64)
        self.assertEqual(run('verify', self.root), 64)

    def test_rejects_missing_manifest(self):
        with self.assertRaises(ValueError):
            run('verify', self.root)

    def test_rejects_tampering(self):
        run('generate', self.root)
        (self.root / 'viewport-390-page.png').write_bytes(png(390, 25))
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
        self.assertEqual(run('generate', self.root), 65)

    def test_all_responsive_full_pages_enforce_real_viewport_width(self):
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            with self.subTest(width=width):
                name = self.root / f'viewport-{width}-page.png'
                original = name.read_bytes()
                name.write_bytes(png(width))
                self.assertEqual(run('generate', self.root), 64)
                name.write_bytes(png(width - 1))
                with self.assertRaisesRegex(ValueError, 'width mismatch'):
                    run('generate', self.root)
                name.write_bytes(original)

    def test_non_fullpage_crops_keep_their_actual_width(self):
        for name, width in (
            ('compact-nav-viewport-320-200-forced-colors.png', 288),
            ('gutenberg-viewport-1440-portfolio-first.png', 368),
            ('appearance-spacious-viewport-1440-content-pagination.png', 800),
        ):
            with self.subTest(name=name):
                path = self.root / name
                path.write_bytes(png(width))
                self.assertEqual(run('generate', self.root), 65)
                path.unlink()

    def test_rejects_missing_appearance_mode_even_if_count_is_unchanged(self):
        victim = self.root / 'appearance-spacious-viewport-1440-photography-lightbox.png'
        victim.unlink()
        (self.root / 'unrelated-extra.png').write_bytes(png(390))
        with self.assertRaisesRegex(ValueError, 'Missing required visual coverage.*spacious'):
            run('generate', self.root)

    def test_rejects_missing_responsive_viewport_even_if_count_is_unchanged(self):
        (self.root / 'viewport-320-page.png').unlink()
        (self.root / 'unrelated-extra.png').write_bytes(png(390))
        with self.assertRaisesRegex(ValueError, 'Missing required visual coverage.*viewport-320-page'):
            run('generate', self.root)

    def test_missing_visual_coverage_invalidates_previous_inventory(self):
        run('generate', self.root)
        (self.root / 'viewport-768-page.png').unlink()
        with self.assertRaisesRegex(ValueError, 'visual coverage|Insufficient screenshot'):
            run('generate', self.root)
        self.assertFalse((self.root / MANIFEST).exists())

    def test_required_coverage_is_independent_of_extra_element_crops(self):
        (self.root / 'gutenberg-viewport-1440-portfolio-first.png').write_bytes(png(300))
        self.assertEqual(run('generate', self.root), 65)
        self.assertEqual(run('verify', self.root), 65)

    def test_missing_faq_cannot_be_replaced_with_unrelated_images(self):
        (self.root / 'knowledge-faq-axe-390-rtl-closed.png').unlink()
        for index in range(12):
            (self.root / f'unrelated-faq-{index}.png').write_bytes(png())
        with self.assertRaisesRegex(ValueError, 'Missing required visual coverage'):
            run('generate', self.root)

    def test_identical_closed_expanded_raster_is_rejected(self):
        closed = self.root / 'knowledge-faq-axe-390-rtl-closed.png'
        expanded = self.root / 'knowledge-faq-axe-390-rtl-expanded.png'
        expanded.write_bytes(closed.read_bytes())
        with self.assertRaisesRegex(ValueError, 'Identical FAQ closed and expanded evidence'):
            run('generate', self.root)

    def test_same_pixels_with_different_png_compression_are_rejected(self):
        closed = self.root / 'knowledge-faq-axe-390-rtl-closed.png'
        expanded = self.root / 'knowledge-faq-axe-390-rtl-expanded.png'
        closed.write_bytes(png(390, 24, compression=1))
        expanded.write_bytes(png(390, 24, compression=9))
        self.assertNotEqual(closed.read_bytes(), expanded.read_bytes())
        with self.assertRaisesRegex(ValueError, 'Identical FAQ closed and expanded evidence'):
            run('generate', self.root)

    def test_identical_desktop_closed_expanded_raster_is_rejected(self):
        closed = self.root / 'knowledge-faq-axe-1440-ltr-closed.png'
        expanded = self.root / 'knowledge-faq-axe-1440-ltr-expanded.png'
        expanded.write_bytes(closed.read_bytes())
        with self.assertRaisesRegex(ValueError, '1440px ltr'):
            run('generate', self.root)

    def test_exact_head_manifest_includes_all_nine_faq_images(self):
        self.assertEqual(run('generate', self.root), 64)
        manifest = json.loads((self.root / MANIFEST).read_text())
        self.assertEqual(manifest['head_sha'], SHA)
        self.assertTrue(REQUIRED_FAQ.issubset(manifest['screenshots']))
        for name in REQUIRED_FAQ:
            with self.subTest(name=name):
                self.assertEqual(manifest['screenshots'][name]['sha256'],
                                 hashlib.sha256((self.root / name).read_bytes()).hexdigest())

    def test_short_final_paragraph_crop_is_rejected(self):
        path = self.root / 'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png'
        path.write_bytes(png(390, 79))
        with self.assertRaisesRegex(ValueError, 'Incomplete FAQ visual crop'):
            run('generate', self.root)

    def test_short_focus_crop_is_rejected(self):
        path = self.root / 'knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png'
        path.write_bytes(png(390, 43))
        with self.assertRaisesRegex(ValueError, 'Incomplete FAQ visual crop'):
            run('generate', self.root)

    def test_desktop_crop_mislabeled_mobile_is_rejected(self):
        path = self.root / 'gutenberg-knowledge-faq-390-rtl-200-forced-colors.png'
        path.write_bytes(png(391))
        with self.assertRaisesRegex(ValueError, 'FAQ crop exceeds viewport'):
            run('generate', self.root)

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
