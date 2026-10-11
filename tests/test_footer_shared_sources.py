"""Regression contracts for the shared active-footer discovery path."""
import json
import os
import subprocess
import unittest
from pathlib import Path

from test_footer_presentation_assets import PHP, ROOT, NONE


PHP_BOTH = PHP.replace(
    'echo json_encode(slateframe_footer_presentation_assets());',
    "echo json_encode(array('presentation' => slateframe_footer_presentation_assets(), "
    "'forms' => slateframe_footer_form_assets(), "
    "'sources' => slateframe_footer_widget_sources()));",
)


class SharedFooterSources(unittest.TestCase):
    def evaluate(self, case):
        done = subprocess.run(
            ['php', '-r', PHP_BOTH], cwd=ROOT, text=True, capture_output=True,
            env={**os.environ, 'SLATEFRAME_FOOTER_CASE': json.dumps(case)}, timeout=15,
        )
        self.assertEqual(done.returncode, 0, done.stderr)
        return json.loads(done.stdout)

    def test_search_widget_without_block_content(self):
        data = self.evaluate({'active': ['search-3']})
        self.assertEqual(data['presentation'], NONE)
        self.assertEqual(data['forms'], {
            'forms': True, 'search_form': True, 'form_content': False,
        })
        self.assertTrue(data['sources']['search_widget'])
        self.assertEqual(data['sources']['contents'], [])

    def test_block_search_without_classic_search_styles(self):
        data = self.evaluate({
            'active': ['block-2'],
            'widgets': {'2': {'content': '<!-- wp:search /-->'}},
        })
        self.assertEqual(data['forms'], {
            'forms': True, 'search_form': False, 'form_content': False,
        })
        self.assertEqual(data['presentation'], NONE)

    def test_synced_pattern_search_and_form_share_source(self):
        data = self.evaluate({
            'active': ['block-2'],
            'widgets': {'2': {'content': '<!-- wp:block {"ref":9} /-->'}},
            'posts': {'9': {'content': '<!-- wp:search /--><form><input></form><div class="slateframe-knowledge-checklist"></div>'}},
        })
        self.assertEqual(data['forms'], {
            'forms': True, 'search_form': False, 'form_content': True,
        })
        self.assertEqual(data['presentation'], {**NONE, 'content_modes': True})
        self.assertEqual(len(data['sources']['contents']), 2)

    def test_classic_widget_comment_is_not_parsed_as_block(self):
        data = self.evaluate({
            'active': ['text-3'],
            'classic': {'widget_text': {'3': {'text': '<!-- wp:query {"className":"slateframe-project-grid"} /-->'}}},
        })
        self.assertEqual(data['presentation'], NONE)
        self.assertEqual(data['forms'], {
            'forms': False, 'search_form': False, 'form_content': False,
        })

    def test_classic_widget_html_class_still_loads_presentation(self):
        data = self.evaluate({
            'active': ['custom_html-3'],
            'classic': {'widget_custom_html': {'3': {'content': '<div class="slateframe-project-grid"><form></form></div>'}}},
        })
        self.assertEqual(data['presentation'], {**NONE, 'content_modes': True, 'query_loop': True})
        self.assertEqual(data['forms'], {
            'forms': True, 'search_form': False, 'form_content': True,
        })

    def test_unpublished_synced_pattern_not_loaded_by_either_detector(self):
        data = self.evaluate({
            'active': ['block-2'],
            'widgets': {'2': {'content': '<!-- wp:block {"ref":9} /-->'}},
            'posts': {'9': {'content': '<form></form><div class="slateframe-project-grid"></div>', 'status': 'draft'}},
        })
        self.assertEqual(data['presentation'], NONE)
        self.assertEqual(data['forms'], {
            'forms': False, 'search_form': False, 'form_content': False,
        })

    def test_footer_grid_is_one_column_without_changing_main_grid(self):
        css = (ROOT / 'assets/css/query-loop.css').read_text()
        self.assertIn('.slateframe-footer-content .wp-block-post-template{grid-template-columns:1fr}', css)
        self.assertIn('.slateframe-project-grid .wp-block-post-template{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))', css)
        self.assertIn(':is(.wp-block-post-excerpt,.wp-block-post-date){color:var(--slateframe-muted)}', css)
        self.assertLessEqual(len(css.encode('utf-8')), 3000)

    def test_shared_markers_preserve_extension_hooks(self):
        source = (ROOT / 'functions.php').read_text()
        footer = (ROOT / 'inc/footer-presentation.php').read_text()
        for name in ['slateframe_photography_marker_classes',
                     'slateframe_content_mode_marker_classes',
                     'slateframe_query_loop_marker_classes']:
            self.assertIn('function ' + name + '(', source)
            self.assertIn(name + '()', footer)
        for hook in ['slateframe_photography_markers', 'slateframe_content_mode_markers', 'slateframe_query_loop_markers']:
            self.assertIn("apply_filters( '" + hook + "'", source)


if __name__ == '__main__':
    unittest.main()

class AssetDependencyClosure(unittest.TestCase):
    PHP_ASSETS = PHP.replace(
        "require_once getcwd() . '/functions.php';",
        r'''
function is_singular() { return false; }
function is_search() { return false; }
function is_404() { return false; }
function is_home() { return true; }
function is_archive() { return false; }
function is_author() { return false; }
function is_rtl() { return false; }
function get_stylesheet_uri() { return '/style.css'; }
function get_template_directory_uri() { return '/wp-content/themes/slateframe'; }
class Slateframe_Test_Theme { function get($key) { return '0.1.0'; } }
function wp_get_theme() { return new Slateframe_Test_Theme(); }
$GLOBALS['styles'] = array();
function wp_enqueue_style($handle, $src, $deps = array(), $version = '') {
    $GLOBALS['styles'][$handle] = $deps;
}
function wp_enqueue_script() {}
require_once getcwd() . '/functions.php';
'''
    ).replace(
        'echo json_encode(slateframe_footer_presentation_assets());',
        "slateframe_assets(); echo json_encode($GLOBALS['styles']);",
    )

    def check_assets(self, case, present, absent):
        done = subprocess.run(
            ['php', '-r', self.PHP_ASSETS], cwd=ROOT, text=True, capture_output=True,
            env={**os.environ, 'SLATEFRAME_FOOTER_CASE': json.dumps(case)}, timeout=15,
        )
        self.assertEqual(done.returncode, 0, done.stderr)
        styles = json.loads(done.stdout)
        for name in present:
            self.assertIn(name, styles)
        for name in absent:
            self.assertNotIn(name, styles)
        for handle, dependencies in styles.items():
            for dependency in dependencies:
                self.assertIn(dependency, styles, f'{handle} depends on missing {dependency}')
        return styles

    def test_footer_presentation_on_non_singular_archive(self):
        styles = self.check_assets({
            'active': ['block-3'],
            'widgets': {'3': {'content': '<!-- wp:query {"className":"slateframe-project-grid"} /-->'
                                        '<!-- wp:image {"lightbox":{"enabled":true}} /-->'}},
        }, ['slateframe-content-modes', 'slateframe-query-loop', 'slateframe-photography'],
            ['slateframe-reading', 'slateframe-forms'])
        self.assertEqual(styles['slateframe-photography'], ['slateframe-style'])
        self.assertEqual(styles['slateframe-content-modes'], ['slateframe-style'])

    def test_footer_classic_search_and_form_styles(self):
        self.check_assets({
            'active': ['search-2', 'custom_html-3'],
            'classic': {'widget_custom_html': {'3': {'content': '<form><input></form>'}}},
        }, ['slateframe-forms', 'slateframe-search-form', 'slateframe-form-content'],
            ['slateframe-reading', 'slateframe-query-loop'])

    def test_inactive_widget_loads_no_contextual_css(self):
        self.check_assets({
            'active': [],
            'widgets': {'3': {'content': '<div class="slateframe-project-grid"></div>'}},
        }, ['slateframe-style', 'slateframe-navigation', 'slateframe-footer'],
            ['slateframe-reading', 'slateframe-query-loop', 'slateframe-photography',
             'slateframe-content-modes', 'slateframe-forms'])