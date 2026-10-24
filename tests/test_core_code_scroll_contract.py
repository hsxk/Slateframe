"""Protect native Core code/preformatted keyboard scrolling without extra runtime CSS."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreCodeScrollContractTest(unittest.TestCase):
    def test_both_native_core_hooks_share_a_narrow_render_filter(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        self.assertIn('function slateframe_focusable_preformatted_block(', php)
        for block in ('code', 'preformatted'):
            self.assertIn(
                "add_filter( 'render_block_core/%s', 'slateframe_focusable_preformatted_block' );" % block,
                php,
            )
        for guard in (
            "'PRE' !== $processor->get_tag()",
            "$processor->has_class( 'wp-block-code' )",
            "$processor->has_class( 'wp-block-preformatted' )",
            "null === $processor->get_attribute( 'tabindex' )",
            "$processor->set_attribute( 'tabindex', '0' )",
        ):
            self.assertIn(guard, php)

    def test_core_scrollers_share_existing_reading_focus_and_overflow_styles(self):
        css = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        self.assertIn('.slateframe-prose pre:not(.wp-block-verse),.wp-block-code{overflow:auto;', css)
        self.assertIn(':is(.wp-block-code,.wp-block-table,.wp-block-calendar,.slateframe-prose pre,.slateframe-prose>table):focus-visible', css)
        self.assertIn('.wp-block-code{direction:ltr;text-align:left}', css)


if __name__ == '__main__':
    unittest.main()
