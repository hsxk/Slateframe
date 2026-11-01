"""Protect the accessible Core home brand when site identity is blank."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BrandHomeTarget(unittest.TestCase):
    def test_real_php_template_handles_empty_and_multilingual_site_names(self):
        run = subprocess.run(
            ['php', str(ROOT / 'tests/fixtures/brand-home.php.fixture')],
            cwd=ROOT, capture_output=True, text=True, timeout=20, check=False,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn('Brand accessible home: 16 cases passed', run.stdout)

    def test_bounded_brand_target_uses_spatial_token(self):
        css = (ROOT / 'style.css').read_text(encoding='utf-8')
        self.assertIn('min-block-size:var(--slateframe-control);color:inherit;text-decoration:none', css)
        self.assertIn(':root[data-slateframe-color-mode=dark]{color-scheme:dark;& .slateframe-color-icon-sun{display:none}& .slateframe-color-icon-moon{display:block}}', css)
        self.assertNotIn('min-block-size:44px', css)

    def test_browser_covers_actual_core_template_and_visual_evidence(self):
        spec = (ROOT / 'tests/browser/brand-home-target.spec.js').read_text(encoding='utf-8')
        for marker in ('pre_option_blogname', 'pre_option_blogdescription',
                       'include get_stylesheet_directory()',
                       '320, 375, 390, 412, 768, 1440, 1920',
                       "'ltr', 'rtl'", 'setRootTextScale', 'toHaveAccessibleName',
                       'toBeGreaterThanOrEqual(43.99)', 'toBeFocused()',
                       'AxeBuilder', 'forcedColors', 'header-blank-brand-390-rtl-400-forced-colors.png',
                       'header-blank-brand-1440-ltr.png'):
            with self.subTest(marker=marker):
                self.assertIn(marker, spec)


if __name__ == '__main__':
    unittest.main()
