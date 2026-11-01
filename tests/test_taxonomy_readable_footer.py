"""Guard readable classic taxonomy footer labels after filtered Core markup."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TaxonomyReadableFooter(unittest.TestCase):
    def test_executable_php_boundaries(self):
        fixture = ROOT / "tests/fixtures/taxonomy-readable-footer.php.fixture"
        result = subprocess.run(["php", str(fixture)], cwd=ROOT,
                                text=True, capture_output=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Readable taxonomy footer: 14 cases passed", result.stdout)

    def test_runtime_preserves_core_taxonomy_and_filter_hooks(self):
        source = (ROOT / "inc/template-tags.php").read_text(encoding="utf-8")
        start = source.index("function slateframe_entry_footer()")
        end = source.index("function slateframe_content_pagination()", start)
        section = source[start:end]
        for marker in ("get_the_category_list(", "get_the_tag_list(",
                       "apply_filters( 'slateframe_entry_categories_html'",
                       "apply_filters( 'slateframe_entry_tags_html'",
                       "slateframe_has_readable_label( $categories )",
                       "slateframe_has_readable_label( $tags )",
                       "wp_kses_post( $categories )", "wp_kses_post( $tags )"):
            with self.subTest(marker=marker):
                self.assertIn(marker, section)
        self.assertNotIn("get_posts(", section)
        self.assertNotIn("WP_Query", section)

    def test_real_browser_contract_and_isolation(self):
        source = (ROOT / "tests/browser/taxonomy-readable-footer.spec.js").read_text(encoding="utf-8")
        for marker in ("execFileSync(", "sf_taxonomy_footer_test", "finally {",
                       "fs.rm(plugin", "wp('post', 'delete'", "for (const width of widths)",
                       "['ltr', 'rtl']", "[16, 64]", "AxeBuilder", "forcedColors",
                       "taxonomy-readable-390-rtl-400-forced-colors.png",
                       "taxonomy-readable-1440-ltr.png"):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)
        result = subprocess.run(["node", "--check", str(ROOT / "tests/browser/taxonomy-readable-footer.spec.js")],
                                text=True, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
