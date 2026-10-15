"""Guard native menu width measurement and keyboard behavior."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'assets/js/theme.js').read_text(encoding='utf-8')
BROWSER=(ROOT/'tests/browser/navigation-intrinsic-width.spec.js').read_text(encoding='utf-8')

class NavigationIntrinsicWidthContract(unittest.TestCase):
    def test_real_box_not_anchor_sum(self):
        self.assertIn('nw=n.getBoundingClientRect().width',JS)
        self.assertNotIn('ls.reduce((a,b)=>a+b.scrollWidth,0)',JS)
        self.assertIn("style===null?n.removeAttribute('style'):n.setAttribute('style',style)",JS)
        self.assertLessEqual(len(JS.encode('utf-8')),3376)

    def test_desktop_rtl_zoom_and_keyboard(self):
        for token in ("['ltr', 'rtl']","'1100px'","'290px'","'64px'",
                      'noOverlap','overflow','is-compact',"'Escape'",
                      'nav-intrinsic-', "toHaveAttribute('inert'"):
            with self.subTest(token=token):
                self.assertIn(token,BROWSER)

if __name__=='__main__': unittest.main()
