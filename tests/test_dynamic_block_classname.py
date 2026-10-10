"""Regression checks for Gutenberg className and image-free Portfolio cards."""
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "functions.php").read_text(encoding="utf-8")

def extract(name):
    start = SOURCE.index("function " + name + "(")
    return SOURCE[start:SOURCE.index("\n}\n", start) + 3]

STUB = r"""
$GLOBALS['parses'] = 0;
class WP_HTML_Tag_Processor {
    function __construct($html) {}
    function next_tag() { return false; }
    function has_class($class) { return false; }
}
function parse_blocks($content) {
    ++$GLOBALS['parses'];
    preg_match_all('/<!-- wp:[a-z0-9\\/-]+ (\\{[^\\n]*?\\}) \\/-->/s', $content, $found);
    $blocks = array();
    foreach ($found[1] as $attrs) {
        $blocks[] = array('attrs' => json_decode($attrs, true));
    }
    return $blocks;
}
"""
FUNCTIONS = extract("slateframe_content_has_class_marker") + "\n" + extract("slateframe_blocks_have_class_marker")

class DynamicBlocks(unittest.TestCase):
    def run_php(self, content):
        code = STUB + FUNCTIONS + "\n" + 'echo json_encode(array(slateframe_content_has_class_marker(' + json.dumps(content) + ', array("slateframe-project-grid")), $GLOBALS["parses"]));'
        done = subprocess.run(["php", "-r", code], capture_output=True, text=True, timeout=10)
        self.assertEqual(done.returncode, 0, done.stderr)
        return json.loads(done.stdout)

    def test_dynamic_classname(self):
        self.assertEqual(self.run_php('<!-- wp:query {"className":"slateframe-project-grid"} /-->'), [True, 1])

    def test_exact_token(self):
        self.assertEqual(self.run_php('<!-- wp:query {"className":"slateframe-project-grid-extra"} /-->'), [False, 1])

    def test_plain_prose(self):
        self.assertEqual(self.run_php('<p>slateframe-project-grid</p>'), [False, 0])

    def test_unrelated_attribute(self):
        self.assertEqual(self.run_php('<!-- wp:query {"other":"slateframe-project-grid"} /-->'), [False, 0])

    def test_nested_blocks(self):
        code = STUB + FUNCTIONS + "\n" + "echo json_encode(slateframe_blocks_have_class_marker(array(array('attrs'=>array('className'=>'outer'),'innerBlocks'=>array(array('attrs'=>array('className'=>'x slateframe-project-grid y'))))), array('slateframe-project-grid')));"
        done = subprocess.run(["php", "-r", code], capture_output=True, text=True, timeout=10)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertTrue(json.loads(done.stdout))

    def test_portfolio_css_budget_and_logical_border(self):
        css = (ROOT / "assets/css/content-modes.css").read_text(encoding="utf-8")
        self.assertLessEqual(len(css.encode("utf-8")), 7000)
        self.assertIn(".slateframe-project-card:not(:has(.wp-block-post-featured-image img))", css)
        self.assertIn("border-inline-start:2px solid var(--slateframe-accent)", css)
if __name__ == "__main__":
    unittest.main()
