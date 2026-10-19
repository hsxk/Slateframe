"""Verify exact-SHA Core FAQ screenshot pairs differ in decoded pixels."""
from pathlib import Path
import unittest
from unittest.mock import patch
import verify_browser_inventory as inventory


class FaqStateDifference(unittest.TestCase):
    def test_both_mobile_and_desktop_pairs_are_checked(self):
        calls = []

        def decoded(path, width, *, include_raster_hash=False):
            calls.append((Path(path).name, width, include_raster_hash))
            expanded = Path(path).stem.endswith('-expanded')
            digest = b'expanded' if expanded else b'closed'
            return ((width, 240 if expanded else 200), digest)

        with patch.object(inventory, 'validate_png', side_effect=decoded):
            inventory.check_faq_state_evidence(Path('/isolated/screenshots'))
        self.assertEqual(len(calls), 4)
        self.assertEqual({width for _, width, _ in calls}, {390, 1440})
        self.assertTrue(all(normalized for _, _, normalized in calls))
        self.assertTrue(any('390-rtl-closed' in name for name, _, _ in calls))
        self.assertTrue(any('1440-ltr-expanded' in name for name, _, _ in calls))

    def test_identical_decoded_pixels_are_rejected_even_if_png_bytes_differ(self):
        with patch.object(inventory, 'validate_png', return_value=((390, 200), b'same-pixels')):
            with self.assertRaisesRegex(ValueError, 'Identical FAQ closed and expanded evidence'):
                inventory.check_faq_state_evidence(Path('/isolated/screenshots'))

    def test_failure_in_second_pair_is_not_masked_by_first_pair(self):
        def decoded(path, width, *, include_raster_hash=False):
            digest = (b'first-closed' if Path(path).stem.endswith('-closed') else b'first-expanded') if width == 390 else b'same'
            expanded = Path(path).stem.endswith('-expanded')
            return ((width, 240 if expanded else 200), digest)

        with patch.object(inventory, 'validate_png', side_effect=decoded):
            with self.assertRaisesRegex(ValueError, '1440px ltr'):
                inventory.check_faq_state_evidence(Path('/isolated/screenshots'))

    def test_inventory_generation_and_verification_both_enforce_pixel_difference(self):
        source = (Path(__file__).resolve().parents[1] / 'tests/verify_browser_inventory.py').read_text()
        self.assertIn('check_faq_state_evidence(root)', source)
        self.assertIn('include_raster_hash=True', source)
        self.assertIn('if bounded_json(target) != expected:', source)


if __name__ == '__main__':
    unittest.main()
