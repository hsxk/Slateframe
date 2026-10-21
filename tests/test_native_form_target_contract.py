"""Guard the Core-first form target CSS without duplicating browser acceptance."""
from pathlib import Path
import unittest

CSS = (Path(__file__).resolve().parents[1] / 'style.css').read_text(encoding='utf-8')


class NativeFormTargetContract(unittest.TestCase):
    def test_native_labels_are_not_replaced_by_scripted_controls(self):
        self.assertIn('label:has(>input:is([type=checkbox],[type=radio]))', CSS)
        self.assertIn('input:is([type=checkbox],[type=radio])+label', CSS)
        browser = (Path(__file__).resolve().parents[1] / 'tests/browser/native-form-targets.spec.js').read_text(encoding='utf-8')
        for target in ('sf-nested-check', 'sf-nested-radio', 'sf-sibling-check', 'sf-sibling-radio'):
            self.assertIn(target, browser)

    def test_labels_use_bounded_shared_control_token(self):
        rule = CSS.split('form :is(label:has(', 1)[1].split('}', 1)[0]
        self.assertIn('min-block-size:var(--slateframe-control)', rule)
        self.assertIn('align-items:center', rule)

    def test_native_file_range_and_color_keep_containment(self):
        rule = CSS.split('form input:is([type=range],[type=color],[type=file]){', 1)[1].split('}', 1)[0]
        for token in ('min-block-size:var(--slateframe-control)', 'min-inline-size:0', 'max-inline-size:100%'):
            self.assertIn(token, rule)


    def test_native_file_button_wraps_in_narrow_forced_color_layout(self):
        self.assertIn('form input:is([type=range],[type=color],[type=file]){', CSS)
        self.assertIn('&[type=file]{white-space:normal;&::file-selector-button{', CSS)
        rule = CSS.split('&::file-selector-button{', 1)[1].split('}', 1)[0]
        for token in ('max-inline-size:100%', 'min-block-size:var(--slateframe-control)', 'white-space:normal', 'overflow-wrap:anywhere'):
            self.assertIn(token, rule)

    def test_native_file_input_itself_wraps_internal_filename(self):
        self.assertIn('&[type=file]{white-space:normal;&::file-selector-button{', CSS)
        self.assertIn('overflow-wrap:anywhere;text-rendering:optimizeLegibility}', CSS)
        browser = (Path(__file__).resolve().parents[1] / 'tests/browser/native-form-targets.spec.js').read_text(encoding='utf-8')
        self.assertIn('inputOverflowWrap', browser)
        self.assertLessEqual(len(CSS.encode('utf-8')), 16000)

if __name__ == '__main__':
    unittest.main()
