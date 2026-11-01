"""Guard native taxonomy-link direction isolation and accessible touch targets."""

from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TaxonomyLinkBidi(unittest.TestCase):
    def css(self, name):
        return (ROOT / "assets" / "css" / name).read_text(encoding="utf-8")

    def test_classic_footer_links_keep_bounded_touch_targets(self):
        css = self.css("publishing.css")
        self.assertIn(
            ".slateframe-entry-footer a{display:inline-flex;align-items:center;"
            "min-block-size:var(--slateframe-control);"
            "min-inline-size:min(100%,var(--slateframe-control));max-inline-size:100%;"
            "overflow-wrap:anywhere;unicode-bidi:isolate}",
            css,
        )
        self.assertNotIn("direction:ltr", css)
        self.assertNotIn("unicode-bidi:bidi-override", css)

    def test_core_taxonomy_blocks_keep_native_links(self):
        for name, selector in (
            ("core-post-terms.css", ".wp-block-post-terms a{"),
            ("core-categories.css", ".wp-block-categories a{"),
        ):
            with self.subTest(name=name):
                css = self.css(name)
                start = css.index(selector) + len(selector)
                end = css.index("}", start)
                rule = css[start:end]
                self.assertIn("unicode-bidi:isolate", rule)
                self.assertIn("min-block-size:var(--slateframe-control)", rule)
                self.assertIn("overflow-wrap:anywhere", rule)
                self.assertNotIn("direction:ltr", rule)

    def test_real_core_browser_parity_contract(self):
        for name in (
            "core-post-terms-parity.spec.js",
            "core-categories-parity.spec.js",
        ):
            with self.subTest(name=name):
                source = (ROOT / "tests/browser" / name).read_text()
                self.assertIn("getComputedStyle(el).unicodeBidi", source)
                self.assertIn("toBe('isolate')", source)
                self.assertIn("for (const width of [320, 375, 390, 412, 768, 1440, 1920])", source)

    def test_no_budget_relaxation(self):
        for name, limit in (
            ("publishing.css", 4500),
            ("core-post-terms.css", 450),
            ("core-categories.css", 550),
        ):
            with self.subTest(name=name):
                self.assertLessEqual((ROOT / "assets" / "css" / name).stat().st_size, limit)

    def test_browser_contract_and_required_screenshots(self):
        browser = (ROOT / "tests/browser/numeric-metadata-bidi.spec.js").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertIn("taxonomyLink.evaluate", browser)
        self.assertIn("computed.target", browser)
        self.assertIn("node.getBoundingClientRect().width", browser)
        self.assertIn("axeFooter.violations", browser)
        self.assertIn("document.activeElement === node", browser)
        for name in (
            "taxonomy-footer-390-rtl-400.png",
            "taxonomy-footer-390-rtl-400-forced-colors.png",
            "taxonomy-footer-1440-ltr.png",
        ):
            with self.subTest(name=name):
                self.assertIn(name, browser)
                self.assertIn(name, workflow)

    def test_browser_syntax(self):
        result = subprocess.run(
            ["node", "--check", str(ROOT / "tests/browser/numeric-metadata-bidi.spec.js")],
            text=True, capture_output=True, timeout=15,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
