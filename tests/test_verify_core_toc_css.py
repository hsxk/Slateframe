"""Regression checks for the native Core TOC quality gate."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_core_toc_css import SELECTOR, verify

BASE = '.slateframe-prose .wp-block-table-of-contents{padding-block:1rem}'
LINK = (SELECTOR + '{display:inline-flex;align-items:center;'
        'min-block-size:var(--slateframe-control);max-inline-size:100%;'
        'overflow-wrap:anywhere}')


class NativeTocGateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.css = self.root / 'assets/css/reading.css'
        self.css.parent.mkdir(parents=True)
        (self.root / 'style.css').write_text('body{color:#222}', encoding='utf-8')
        (self.root / 'rtl.css').write_text('body{direction:rtl}', encoding='utf-8')
        self.css.write_text(BASE + LINK, encoding='utf-8')

    def reject(self, value):
        self.css.write_text(value, encoding='utf-8')
        with self.assertRaises(ValueError):
            verify(self.root)

    def test_valid_frontend_editor_targets(self):
        verify(self.root)

    def test_multiline_css_accepted(self):
        self.css.write_text(BASE + SELECTOR + '{\n' + LINK.split('{', 1)[1].replace(';', ';\n'), encoding='utf-8')
        verify(self.root)

    def test_rejects_nonexistent_ancestor(self):
        self.reject(BASE + '.never ' + LINK)

    def test_rejects_print_only_rule(self):
        self.reject(BASE + '@media print{' + LINK + '}')

    def test_rejects_supports_only_rule(self):
        self.reject(BASE + '@supports (display:grid){' + LINK + '}')

    def test_rejects_comma_list_selector(self):
        self.reject(BASE + '.never, ' + LINK)

    def test_rejects_conditional_override_after_valid_rule(self):
        self.reject(BASE + LINK + '@media(max-width:320px){' + LINK + '}')

    def test_rejects_prefixed_override_after_valid_rule(self):
        self.reject(BASE + LINK + '.never ' + LINK)

    def test_rejects_unbalanced_braces(self):
        self.reject(BASE + LINK + '}')

    def test_rejects_unterminated_css_string(self):
        self.reject(BASE + LINK + '.other{content:"unterminated}')

    def test_unrelated_button_cannot_satisfy_target(self):
        self.reject(BASE + SELECTOR + '{display:inline-flex}' + '.wp-block-file__button{min-block-size:var(--slateframe-control)}')

    def test_missing_editor_parity_rejected(self):
        self.reject(BASE + LINK.replace('.editor-styles-wrapper', '.slateframe-prose'))

    def test_missing_44px_token_rejected(self):
        self.reject(BASE + LINK.replace('var(--slateframe-control)', '28px'))

    def test_missing_width_containment_rejected(self):
        self.reject(BASE + LINK.replace('max-inline-size:100%;', ''))

    def test_missing_wrap_rejected(self):
        self.reject(BASE + LINK.replace('overflow-wrap:anywhere', 'overflow-wrap:normal'))

    def test_nowrap_rejected(self):
        self.reject(BASE + LINK.replace('}', ';white-space:nowrap}'))

    def test_duplicate_rule_rejected(self):
        self.reject(BASE + LINK + LINK)

    def test_duplicate_declaration_rejected(self):
        self.reject(BASE + LINK.replace('}', ';min-block-size:12px}'))

    def test_commented_out_rule_rejected(self):
        self.reject(BASE + '/* ' + LINK + ' */')

    def test_malformed_rule_rejected(self):
        self.reject(BASE + LINK.replace('display:inline-flex;', 'display'))

    def test_legacy_marker_rejected(self):
        for marker in ('ez-toc', 'yoast', 'jetpack', 'wpcode', 'polylang', 'time2log', 'time2analyze'):
            with self.subTest(marker=marker):
                self.reject(BASE + LINK + f'.{marker}-legacy{{display:none}}')

    def test_linked_css_rejected(self):
        self.css.unlink()
        self.css.symlink_to(self.root / 'style.css')
        with self.assertRaises(ValueError):
            verify(self.root)

    def test_linked_css_directory_rejected(self):
        self.css.unlink()
        self.css.parent.rmdir()
        self.css.parent.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            verify(self.root)

    def test_missing_root_style_rejected(self):
        (self.root / 'style.css').unlink()
        with self.assertRaises(ValueError):
            verify(self.root)


if __name__ == '__main__':
    unittest.main()
