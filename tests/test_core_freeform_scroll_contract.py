"""Protect Core Freeform keyboard scrolling without changing saved content."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreFreeformScrollContractTest(unittest.TestCase):
    def test_freeform_filter_is_core_scoped_and_preserves_authored_focus(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        self.assertIn("add_filter( 'render_block_core/freeform', 'slateframe_focusable_freeform_scrollers' );", php)
        body = php.split('function slateframe_focusable_freeform_scrollers(', 1)[1].split("add_filter( 'render_block_core/freeform'", 1)[0]
        for token in ("new WP_HTML_Tag_Processor", "'PRE' !== $tag && 'TABLE' !== $tag",
                      "'wp-block-verse'", "null === $processor->get_attribute( 'tabindex' )",
                      "$processor->set_attribute( 'tabindex', '0' )"):
            self.assertIn(token, body)
        self.assertNotIn("add_filter( 'render_block_core/html', 'slateframe_focusable_freeform_scrollers' );", php)
        self.assertNotIn("add_filter( 'the_content', 'slateframe_focusable_freeform_scrollers' );", php)

    def test_existing_native_styles_cover_both_scrollers(self):
        css = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        self.assertIn('.slateframe-prose pre:not(.wp-block-verse),.wp-block-code{overflow:auto;', css)
        self.assertIn('.slateframe-prose{& blockquote{', css)
        self.assertIn('&>table{display:block;', css)
        self.assertIn('.slateframe-prose>table):focus-visible', css)


if __name__ == '__main__':
    unittest.main()
