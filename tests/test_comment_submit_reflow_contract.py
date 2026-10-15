"""Guard Core comment-form submit markup and real-browser zoom coverage."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CommentSubmitReflowContract(unittest.TestCase):
    def test_native_comment_form_uses_wrapping_button_and_core_placeholders(self):
        php = (ROOT / 'comments.php').read_text(encoding='utf-8')
        self.assertIn('comment_form(', php)
        self.assertIn("'submit_button' => '<button", php)
        for marker in ('name="%1$s"', 'id="%2$s"', 'class="%3$s"', '>%4$s</button>'):
            with self.subTest(marker=marker):
                self.assertIn(marker, php)
        self.assertNotIn('type="submit" value="%4$s"', php)

    def test_playwright_covers_forced_colors_zoom_rtl_and_overflow(self):
        script = (ROOT / 'tests/browser/comment-submit-reflow.spec.js').read_text(encoding='utf-8')
        for marker in ('forcedColors:', "'400%'", "['ltr', 'rtl']", 'pageOverflow',
                       'textOverflow', 'verticalOverflow', 'outlineStyle',
                       'toBeFocused()', 'fullPage: true'):
            with self.subTest(marker=marker):
                self.assertIn(marker, script)

    def test_no_new_runtime_script_or_theme_specific_business_feature(self):
        php = (ROOT / 'comments.php').read_text(encoding='utf-8')
        self.assertNotIn('<script', php)
        self.assertNotIn('time2log_', php.lower())
        self.assertNotIn('license', php.lower())


if __name__ == '__main__':
    unittest.main()
