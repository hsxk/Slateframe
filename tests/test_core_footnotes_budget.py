"""Guard the shared runtime envelope after adding Core Footnotes controls.

The footer and the search/empty-state routes still load the shared theme CSS,
so a small new Core primitive must not silently exceed their strict budgets.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def size(relative_path):
    return (ROOT / relative_path).stat().st_size


class CoreFootnotesRuntimeBudget(unittest.TestCase):
    def test_unchanged_component_caps(self):
        for file_name, limit in (
            ('style.css', 16000),
            ('assets/css/footer.css', 2000),
            ('assets/css/reading.css', 7000),
            ('assets/css/print.css', 3000),
        ):
            with self.subTest(file=file_name):
                self.assertLessEqual(size(file_name), limit)

    def test_all_fifteen_runtime_envelopes(self):
        paths = {
            'style': 'style.css', 'navigation': 'assets/css/navigation.css',
            'footer': 'assets/css/footer.css', 'js': 'assets/js/theme.js',
            'forms': 'assets/css/forms.css', 'search': 'assets/css/search-form.css',
            'empty': 'assets/css/empty-state.css', 'reading': 'assets/css/reading.css',
            'publishing': 'assets/css/publishing.css',
            'formcontent': 'assets/css/form-content.css',
            'comments': 'assets/css/comments.css', 'photo': 'assets/css/photography.css',
            'modes': 'assets/css/content-modes.css', 'query': 'assets/css/query-loop.css',
        }
        base = 'style navigation footer js'
        reading = base + ' reading'
        publishing = reading + ' publishing'
        contextual = publishing + ' modes'
        cases = (
            ('base', base, 25000),
            ('forms', base + ' forms', 24500),
            ('search', base + ' forms search', 24800),
            ('empty', base + ' forms search empty', 25000),
            ('reading', reading, 30000),
            ('publishing', publishing, 34500),
            ('authored-form', publishing + ' forms formcontent', 35500),
            ('discussion', publishing + ' forms comments', 37500),
            ('authored-form-discussion', publishing + ' forms comments formcontent', 38000),
            ('photography', publishing + ' photo', 40000),
            ('photography-discussion', publishing + ' photo forms comments', 43000),
            ('contextual', contextual, 42000),
            ('contextual-discussion', contextual + ' forms comments', 45000),
            ('portfolio', contextual + ' query', 45000),
            ('portfolio-discussion', contextual + ' query forms comments', 48000),
        )
        for label, files, limit in cases:
            actual = sum(size(paths[key]) for key in files.split())
            with self.subTest(runtime=label):
                self.assertLessEqual(actual, limit, f'{label}: {actual} bytes exceeds {limit}')

    def test_screen_only_target_and_no_added_javascript(self):
        css = (ROOT / 'style.css').read_text(encoding='utf-8')
        self.assertIn('@media screen{.wp-block-footnotes a[href^="#fnref"]', css)
        self.assertIn('display:inline-grid;place-items:center', css)
        self.assertIn('min-inline-size:var(--slateframe-control)', css)
        self.assertIn('min-block-size:var(--slateframe-control)', css)
        self.assertIn('@media(forced-colors:active)', css)
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        self.assertIn("add_editor_style( array( 'style.css'", php)


if __name__ == '__main__':
    unittest.main()
