"""Guard real-WordPress browser fixture isolation without dropping coverage."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/quality.yml"
BROWSER = ROOT / "tests/browser"


class BrowserFixtureIsolationContractTest(unittest.TestCase):
    def test_shared_wordpress_database_has_separate_browser_phases(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("readonly_specs=()", workflow)
        self.assertIn("stateful_specs=()", workflow)
        self.assertIn("grep -Eq 'execFileSync|execSync|spawnSync'", workflow)
        self.assertIn('npx playwright test "${readonly_specs[@]}"', workflow)
        self.assertIn('npx playwright test "${stateful_specs[@]}" --workers=1', workflow)
        self.assertIn('test "${#stateful_specs[@]}" -gt 0', workflow)

    def test_real_footer_mutation_suites_remain_discoverable(self):
        for name in ("footer-core-search.spec.js", "footer-presentation.spec.js"):
            with self.subTest(name=name):
                source = (BROWSER / name).read_text(encoding="utf-8")
                self.assertIn("execFileSync(", source)
                self.assertIn("finally {", source)
                if name == "footer-core-search.spec.js":
                    self.assertIn("footerWidgetMutation(fixtureId, 'install')", source)
                    self.assertIn("footerWidgetMutation(fixtureId, 'remove')", source)
                    helper = (BROWSER / "support/footer-widget-fixture.js").read_text(encoding="utf-8")
                    self.assertIn("wp_set_sidebars_widgets", helper)
                    self.assertIn("flock( $lock, LOCK_EX )", helper)
                    self.assertIn("wp_cache_delete( 'alloptions', 'options' )", helper)
                    self.assertIn("fixture ID already exists", helper)
                else:
                    self.assertIn("wp_set_sidebars_widgets", source)

    def test_footer_widget_isolation_regression_is_executed(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("node tests/browser/test-footer-widget-fixture.cjs", workflow)
        helper = (BROWSER / "support/footer-widget-fixture.js").read_text(encoding="utf-8")
        self.assertIn("const viewports = [320, 375, 390, 412, 768, 1440, 1920]", helper)
        self.assertIn("wp_cache_delete( 'sidebars_widgets', 'options' )", helper)

    def test_filtered_front_page_fixture_restores_global_options(self):
        source = (BROWSER / "menu-front-page-recovery.spec.js").read_text(encoding="utf-8")
        for marker in ("sf_menu_front_test", "pre_wp_nav_menu", "wp_list_pages",
                       "finally {", "fs.rm(plugin", "flag: 'wx'",
                       "wp('option', 'update', 'show_on_front', originalShow)",
                       "wp('option', 'update', 'page_on_front', originalFront)"):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)

    def test_taxonomy_footer_fixture_cleans_up_temporary_post_and_plugin(self):
        source = (BROWSER / "taxonomy-readable-footer.spec.js").read_text(encoding="utf-8")
        for marker in ("sf_taxonomy_footer_test", "execFileSync(", "finally {",
                       "fs.rm(plugin", "flag: 'wx'", "wp('post', 'delete'",
                       "taxonomy-readable-category-390-rtl-400-forced-colors.png"):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)

    def test_media_caption_fixture_cleans_up_attachment_post_and_plugin(self):
        source = (BROWSER / "media-readable-caption.spec.js").read_text(encoding="utf-8")
        for marker in ("wp('media', 'import'", "wp('post', 'meta', 'update'",
                       "finally {", "fs.rm(plugin", "flag: 'wx'",
                       "wp_delete_attachment(", "wp('post', 'delete'",
                       "media-readable-attachment-390-rtl-400-forced-colors.png"):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)

    def test_readonly_phase_preserves_every_other_browser_suite(self):
        specs = list(BROWSER.glob("*.spec.js"))
        self.assertGreater(len(specs), 10)
        writers = [p for p in specs if any(token in p.read_text(encoding="utf-8")
                   for token in ("execFileSync", "execSync", "spawnSync"))]
        self.assertGreaterEqual(len(writers), 2)
        self.assertLess(len(writers), len(specs))


if __name__ == "__main__":
    unittest.main()
