"""CJK display headings must retain natural tracking in frontend and Gutenberg."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
RULE = ':is(h1,h2,h3,.wp-block-post-title):is(:lang(zh),:lang(ja),:lang(ko)){letter-spacing:normal}'


class CjkHeadingTrackingContract(unittest.TestCase):
    def test_frontend_and_editor_selectors(self):
        css = (ROOT / 'style.css').read_text(encoding='utf-8')
        editor = (ROOT / 'assets/css/editor.css').read_text(encoding='utf-8')
        self.assertEqual(css.count(RULE), 1)
        self.assertNotIn(':lang(zh,ja,ko)', css)
        self.assertIn('.wp-block-post-title:not(.wp-block-query .wp-block-post-title):is(:lang(zh),:lang(ja),:lang(ko)){letter-spacing:normal}', editor)
        self.assertIn('letter-spacing:-0.05em', css)

    def test_static_budgets_unchanged(self):
        paths = ('style.css', 'assets/css/navigation.css', 'assets/css/footer.css',
                 'assets/js/theme.js', 'assets/css/reading.css', 'assets/css/publishing.css',
                 'assets/css/forms.css', 'assets/css/comments.css', 'assets/css/form-content.css')
        self.assertLessEqual((ROOT / 'style.css').stat().st_size, 16000)
        self.assertLessEqual(sum((ROOT / name).stat().st_size for name in paths), 38000)

    def test_browser_and_real_editor_regressions(self):
        browser = (ROOT / 'tests/browser/cjk-heading-tracking.spec.js').read_text(encoding='utf-8')
        editor = (ROOT / 'tests/browser/cjk-heading-editor.spec.js').read_text(encoding='utf-8')
        for term in ('ja', 'ja-JP', 'zh-Hans', 'zh-Hant', 'ko-KR', 'en', '320', '375', '390', '412', '768', '1440', '1920', 'rtl', '200%', 'forcedColors', 'scrollWidth'):
            self.assertIn(term, browser)
        for term in ('SLATEFRAME_EDITOR_POST_ID', 'editor-canvas', 'wp-block-post-title', 'domcontentloaded', 'ja', 'en', 'rtl', '200%', 'forcedColors'):
            self.assertIn(term, editor)


if __name__ == '__main__':
    unittest.main()
