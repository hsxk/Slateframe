"""Core Details screenshot evidence must show actual expanded content growth."""
from pathlib import Path
import unittest
from unittest.mock import patch

import verify_browser_inventory as inventory


class FaqExpansionGeometry(unittest.TestCase):
    @staticmethod
    def validate_with_heights(mobile_closed=535, mobile_expanded=764,
                              desktop_closed=490, desktop_expanded=636):
        heights = {
            (390, False): mobile_closed,
            (390, True): mobile_expanded,
            (1440, False): desktop_closed,
            (1440, True): desktop_expanded,
        }

        def decoded(path, width, *, include_raster_hash=False):
            expanded = Path(path).stem.endswith('-expanded')
            # Distinct raster hashes ensure the geometry check cannot be
            # accidentally satisfied by the existing identical-pixels guard.
            return ((width, heights[(width, expanded)]),
                    f'{width}-{expanded}'.encode('ascii'))

        with patch.object(inventory, 'validate_png', side_effect=decoded):
            inventory.check_faq_state_evidence(Path('/isolated/screenshots'))

    def test_real_wordpress_evidence_dimensions_are_accepted(self):
        self.validate_with_heights()

    def test_five_pixel_hover_difference_is_not_an_expanded_answer(self):
        with self.assertRaisesRegex(ValueError, '390px rtl'):
            self.validate_with_heights(mobile_expanded=540)

    def test_twenty_three_pixel_difference_is_insufficient(self):
        with self.assertRaisesRegex(ValueError, '390px rtl'):
            self.validate_with_heights(mobile_expanded=558)

    def test_twenty_four_pixel_difference_is_accepted(self):
        self.validate_with_heights(mobile_expanded=559, desktop_expanded=514)

    def test_desktop_pair_is_checked_independently(self):
        with self.assertRaisesRegex(ValueError, '1440px ltr'):
            self.validate_with_heights(desktop_expanded=500)

    def test_shrinking_expanded_state_is_rejected(self):
        with self.assertRaisesRegex(ValueError, '390px rtl'):
            self.validate_with_heights(mobile_expanded=500)

    def test_real_inventory_path_invokes_geometry_check(self):
        source = (Path(__file__).resolve().parents[1] /
                  'tests/verify_browser_inventory.py').read_text(encoding='utf-8')
        self.assertIn('check_faq_state_evidence(root)', source)
        self.assertIn('expanded_size[1] - closed_size[1] < 24', source)


if __name__ == '__main__':
    unittest.main()
