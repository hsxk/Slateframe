"""Isolated regressions for contextual footer presentation before WP/Chromium CI."""
import json
import os
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PHP = r'''
define('ABSPATH', __DIR__);
$GLOBALS['sidebars'] = array('footer-content' => array());
$GLOBALS['widgets'] = array();
$GLOBALS['classic'] = array();
$GLOBALS['posts'] = array();
function get_template_directory() { return getcwd(); }
function add_action() {}
function add_filter() {}
function apply_filters($name, $value) {
    if ($name === 'slateframe_query_loop_markers') $value[] = 'custom-grid';
    return $value;
}
function wp_get_sidebars_widgets() { return $GLOBALS['sidebars']; }
function get_option($name, $fallback = array()) {
    return $name === 'widget_block' ? $GLOBALS['widgets'] : ($GLOBALS['classic'][$name] ?? $fallback);
}
class WP_Post {
    public $post_type;
    public $post_status;
    public $post_content;
    function __construct($content, $status = 'publish', $type = 'wp_block') {
        $this->post_content = $content;
        $this->post_status = $status;
        $this->post_type = $type;
    }
}
function get_post($id = 0) { return $GLOBALS['posts'][$id] ?? null; }
function has_block($name, $content) {
    return strpos($content, '<!-- wp:' . str_replace('core/', '', $name)) !== false;
}
function parse_blocks($content) {
    preg_match_all('/<!-- wp:([a-z0-9\\/-]+)(?: (\\{[^\\n]*?\\}))? \\/-->/', $content, $found, PREG_SET_ORDER);
    $blocks = array();
    foreach ($found as $part) {
        $blocks[] = array('blockName' => 'core/' . $part[1], 'attrs' => isset($part[2]) ? json_decode($part[2], true) : array(), 'innerBlocks' => array());
    }
    return $blocks;
}
class WP_HTML_Tag_Processor {
    private $tags;
    private $index = -1;
    function __construct($html) {
        preg_match_all('/<([a-z][a-z0-9:-]*)\\b([^>]*)>/i', $html, $parts, PREG_SET_ORDER);
        $this->tags = $parts;
    }
    function next_tag($query = null) {
        while (++$this->index < count($this->tags)) {
            if (!is_array($query) || strtoupper($this->tags[$this->index][1]) === ($query['tag_name'] ?? '')) return true;
        }
        return false;
    }
    function has_class($class) {
        if (!isset($this->tags[$this->index])) return false;
        if (!preg_match('/\\bclass=["\\\']([^"\\\']+)["\\\']/', $this->tags[$this->index][2], $match)) return false;
        return in_array($class, preg_split('/\\s+/', $match[1]), true);
    }
}
require_once getcwd() . '/functions.php';
$case = json_decode(getenv('SLATEFRAME_FOOTER_CASE'), true);
$GLOBALS['sidebars'] = array('footer-content' => $case['active']);
$GLOBALS['widgets'] = $case['widgets'] ?? array();
$GLOBALS['classic'] = $case['classic'] ?? array();
foreach (($case['posts'] ?? array()) as $id => $post) {
    $GLOBALS['posts'][(int)$id] = new WP_Post($post['content'], $post['status'] ?? 'publish', $post['type'] ?? 'wp_block');
}
echo json_encode(slateframe_footer_presentation_assets());
'''

NONE = {"photography": False, "content_modes": False, "query_loop": False}


class FooterPresentationAssets(unittest.TestCase):
    def check_case(self, name, case, expected):
        run = subprocess.run(
            ["php", "-r", PHP], cwd=ROOT, text=True, capture_output=True,
            env={**os.environ, "SLATEFRAME_FOOTER_CASE": json.dumps(case)}, timeout=15,
        )
        self.assertEqual(run.returncode, 0, name + ": " + run.stderr)
        self.assertEqual(json.loads(run.stdout), expected, name)

    def test_widget_content_and_pattern_scenarios(self):
        photo = {**NONE, "photography": True}
        knowledge = {**NONE, "content_modes": True}
        query = {**NONE, "content_modes": True, "query_loop": True}
        cases = {
            "empty": ({"active": []}, NONE),
            "inactive": ({"active": [], "widgets": {"3": {"content": '<div class="slateframe-project-grid"></div>'}}}, NONE),
            "photo-html": ({"active": ["block-3"], "widgets": {"3": {"content": '<div class="is-style-slateframe-contact-sheet"></div>'}}}, photo),
            "photo-dynamic": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:gallery {"className":"is-style-slateframe-diptych"} /-->'}}}, photo),
            "portfolio-dynamic": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:query {"className":"slateframe-project-grid"} /-->'}}}, query),
            "knowledge-dynamic": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:group {"className":"slateframe-knowledge-checklist"} /-->'}}}, knowledge),
            "unrelated-prose": ({"active": ["block-3"], "widgets": {"3": {"content": '<p>slateframe-project-grid</p>'}}}, NONE),
            "partial-class": ({"active": ["block-3"], "widgets": {"3": {"content": '<div class="slateframe-project-grid-other"></div>'}}}, NONE),
            "classic-text": ({"active": ["text-4"], "classic": {"widget_text": {"4": {"text": '<div class="slateframe-project-grid"></div>'}}}}, query),
            "classic-html": ({"active": ["custom_html-5"], "classic": {"widget_custom_html": {"5": {"content": '<figure class="is-style-slateframe-photo-feature"></figure>'}}}}, photo),
            "native-lightbox": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:image {"lightbox":{"enabled":true}} /-->'}}}, photo),
            "disabled-lightbox": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:image {"lightbox":{"enabled":false}} /-->'}}}, NONE),
            "custom-marker-filter": ({"active": ["block-3"], "widgets": {"3": {"content": '<div class="custom-grid"></div>'}}}, {**NONE, "query_loop": True}),
            "synced-published": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:block {"ref":9} /-->'}}, "posts": {"9": {"content": '<!-- wp:query {"className":"slateframe-project-grid"} /-->'}}}, query),
            "synced-two-level": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:block {"ref":9} /-->'}}, "posts": {"9": {"content": '<!-- wp:block {"ref":10} /-->'}, "10": {"content": '<div class="slateframe-project-grid"></div>'}}}, query),
            "synced-cycle": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:block {"ref":9} /-->'}}, "posts": {"9": {"content": '<!-- wp:block {"ref":10} /-->'}, "10": {"content": '<!-- wp:block {"ref":9} /--><div class="slateframe-knowledge-checklist"></div>'}}}, knowledge),
            "multi-token-dynamic": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:query {"className":"other slateframe-project-grid additional"} /-->'}}}, query),
            "synced-draft": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:block {"ref":9} /-->'}}, "posts": {"9": {"content": '<div class="slateframe-project-grid"></div>', "status": "draft"}}}, NONE),
            "synced-wrong-type": ({"active": ["block-3"], "widgets": {"3": {"content": '<!-- wp:block {"ref":9} /-->'}}, "posts": {"9": {"content": '<div class="slateframe-project-grid"></div>', "type": "post"}}}, NONE),
            "mixed-widgets": ({"active": ["block-3", "block-4", "text-5"], "widgets": {"3": {"content": '<!-- wp:image {"lightbox":{"enabled":true}} /-->'}, "4": {"content": '<!-- wp:query {"className":"slateframe-project-grid"} /-->'}}, "classic": {"widget_text": {"5": {"text": '<div class="slateframe-knowledge-checklist"></div>'}}}}, {"photography": True, "content_modes": True, "query_loop": True}),
            "invalid-ids": ({"active": ["block-0", "block-nope", "search-3", "text-0"]}, NONE),
        }
        for name, (case, expected) in cases.items():
            with self.subTest(name=name):
                self.check_case(name, case, expected)

    def test_archive_dependency_fallback(self):
        source = (ROOT / "functions.php").read_text()
        self.assertIn("$footer_presentation  = slateframe_footer_presentation_assets();", source)
        self.assertEqual(source.count("is_singular() ? array( 'slateframe-reading' ) : array( 'slateframe-style' )"), 3)
        self.assertIn("array( 'slateframe-content-modes' )", source)
        helper = (ROOT / "inc/footer-presentation.php").read_text()
        self.assertIn("slateframe_synced_pattern_contents", helper)
        self.assertIn("slateframe_blocks_have_lightbox", helper)
        self.assertIn("slateframe_query_loop_marker_classes", helper)
        self.assertIn("slateframe_query_loop_markers", source)


if __name__ == "__main__":
    unittest.main()