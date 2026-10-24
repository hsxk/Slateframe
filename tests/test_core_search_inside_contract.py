"""Keep Core Search button-inside responsive without replacing Core."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreSearchInsideContract(unittest.TestCase):
    def test_bounded_core_only_rules(self):
        css = (ROOT / 'style.css').read_text(encoding='utf-8')
        self.assertIn(':is(.wp-block-search__button-outside,.wp-block-search__button-inside) .wp-block-search__inside-wrapper', css)
        self.assertIn('display:grid;grid-template-columns:minmax(0,1fr);gap:var(--slateframe-component-gap)', css)
        self.assertIn(':is(.wp-block-search__button-outside,.wp-block-search__button-inside) .wp-block-search__button{margin:0;inline-size:100%;white-space:normal}', css)
        self.assertIn('@media(max-width:640px)', css)
        self.assertLessEqual(len(css.encode('utf-8')), 16000)

    def test_real_wordpress_browser_coverage(self):
        js = (ROOT / 'tests/browser/core-search-button-inside.spec.js').read_text(encoding='utf-8')
        for width in (320,375,390,412,640,768,1440,1920):
            self.assertIn(str(width), js)
        for marker in ('wp:search', 'button-inside', 'FormData', 'toHaveAccessibleName',
                       'ltr', 'rtl', '[16,32,64]', 'forcedColors', 'AxeBuilder',
                       'keyboard.press', 'scrollWidth', 'wp(\'post\',\'delete\'',
                       'core-search-inside-320-rtl-400.png'):
            self.assertIn(marker, js)


if __name__ == '__main__':
    unittest.main()
