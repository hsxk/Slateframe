"""Core comment forms wrap native submit labels without overriding plugin markup."""
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHP = r"""
define('ABSPATH', getcwd());
require getcwd() . '/inc/template-tags.php';
$original = '<input name="%1$s" type="submit" id="%2$s" class="%3$s" value="%4$s" />';
$custom = '<button class="plugin-button">Custom</button>';
$cases = array(
    'core' => slateframe_comment_form_reflow_defaults(array('submit_button' => $original)),
    'custom' => slateframe_comment_form_reflow_defaults(array('submit_button' => $custom)),
    'empty' => slateframe_comment_form_reflow_defaults(array()),
    'invalid' => slateframe_comment_form_reflow_defaults('invalid'),
);
echo json_encode($cases);
"""


class CoreCommentSubmitReflow(unittest.TestCase):
    def test_core_default_becomes_wrapping_button_and_custom_markup_survives(self):
        result = subprocess.run(['php', '-r', PHP], cwd=ROOT, text=True,
                                capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        values = json.loads(result.stdout)
        core = values['core']['submit_button']
        self.assertTrue(core.startswith('<button name="%1$s" type="submit"'))
        self.assertIn('id="%2$s" class="%3$s" value="%4$s"', core)
        self.assertIn('>%4$s</button>', core)
        self.assertEqual(values['custom']['submit_button'],
                         '<button class="plugin-button">Custom</button>')
        self.assertEqual(values['empty'], [])  # PHP encodes an empty array as JSON [].
        self.assertEqual(values['invalid'], 'invalid')

    def test_theme_bootstrap_registers_the_real_core_filter(self):
        # The isolated PHP harness loads only template-tags.php; WordPress loads
        # functions.php, where registration actually occurs. Guard that boundary.
        bootstrap = (ROOT / 'functions.php').read_text()
        import re
        self.assertRegex(
            bootstrap,
            re.compile(r"add_filter\s*\(\s*['\"]comment_form_defaults['\"]\s*,\s*"
                       r"['\"]slateframe_comment_form_reflow_defaults['\"]\s*\)\s*;"),
        )
        self.assertIn("require_once get_template_directory() . '/inc/template-tags.php';", bootstrap)

    def test_browser_requires_native_button_and_complete_zoomed_label(self):
        spec = (ROOT / 'tests/browser/page-comments-core-ownership.spec.js').read_text()
        for token in ('button#submit', 'scrollWidth', 'getBoundingClientRect',
                      'textContent', "fontSize = '64px'",
                      'page-comments-core-390-rtl-400.png',
                      'page-comments-core-390-rtl-400-forced-colors.png'):
            with self.subTest(token=token):
                self.assertIn(token, spec)
        css = (ROOT / 'assets/css/core-post-comments-form.css').read_text()
        self.assertNotIn('font-size:min(', css)


if __name__ == '__main__':
    unittest.main()
