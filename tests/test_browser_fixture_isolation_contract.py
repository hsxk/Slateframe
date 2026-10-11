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
                self.assertIn("wp_set_sidebars_widgets", source)
                self.assertIn("finally {", source)

    def test_readonly_phase_preserves_every_other_browser_suite(self):
        specs = list(BROWSER.glob("*.spec.js"))
        self.assertGreater(len(specs), 10)
        writers = [p for p in specs if any(token in p.read_text(encoding="utf-8")
                   for token in ("execFileSync", "execSync", "spawnSync"))]
        self.assertGreaterEqual(len(writers), 2)
        self.assertLess(len(writers), len(specs))


if __name__ == "__main__":
    unittest.main()
