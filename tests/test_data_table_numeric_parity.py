"""Keep tabular numerals on Core's figure and native table."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DataTableNumericParity(unittest.TestCase):
    def test_core_data_style_targets_table_and_figure(self):
        css = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        self.assertIn(
            '.wp-block-table.is-style-slateframe-data table,.wp-block-table.is-style-slateframe-data{font-variant-numeric:tabular-nums}',
            css,
        )


if __name__ == '__main__':
    unittest.main()
