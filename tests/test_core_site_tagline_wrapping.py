"""Core Site Tagline must wrap naturally without sacrificing narrow-screen containment."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreSiteTaglineWrapping(unittest.TestCase):
    def test_natural_wrapping_and_width(self):
        css = (ROOT / 'assets/css/core-site-tagline.css').read_text()
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        self.assertIn('.wp-block-site-tagline{min-inline-size:0;overflow-wrap:break-word;word-break:normal}', css)
        self.assertIn('.wp-block-site-tagline:not(.alignwide):not(.alignfull){max-inline-size:100%}', css)
        self.assertNotIn('overflow-wrap:anywhere', css)
        self.assertLessEqual(len(css.encode()), 240)
        self.assertIn('test $(wc -c < assets/css/core-site-tagline.css) -le 240', workflow)
        for forbidden in ('!important', 'display:none', 'time2log_', 'javascript'):
            self.assertNotIn(forbidden, css)


if __name__ == '__main__':
    unittest.main()
