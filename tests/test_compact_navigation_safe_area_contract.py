"""Guard compact navigation safe-area geometry and short-landscape browser coverage."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CompactNavigationSafeAreaContract(unittest.TestCase):
    def test_both_compact_height_limits_reserve_safe_area(self):
        css = (ROOT / 'assets/css/navigation.css').read_text(encoding='utf-8')
        pattern = r'max-block-size:min\((?:70|55)dvh,calc\(100dvh - var\(--slateframe-header-height\) - 2\*var\(--slateframe-stack-gap\) - env\(safe-area-inset-bottom,0px\)\)\)'
        self.assertEqual(len(re.findall(pattern, css)), 2)

    def test_short_landscape_rtl_coverage(self):
        spec = (ROOT / 'tests/browser/design-system.spec.js').read_text(encoding='utf-8')
        self.assertIn('compact navigation remains scrollable in short landscape and RTL', spec)
        for dims in ('[568, 320]', '[667, 375]', '[812, 375]'):
            self.assertIn(dims, spec)
        self.assertIn("['ltr', 'rtl']", spec)
        self.assertIn('node.scrollTop', spec)
        self.assertIn('state.scrollHeight', spec)


if __name__ == '__main__':
    unittest.main()
