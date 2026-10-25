"""Guard native Core Previous/Next Post presentation and real-browser evidence."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostNavigationParity(unittest.TestCase):
    def test_core_owned_links_and_conditional_style(self):
        functions = (ROOT / "functions.php").read_text()
        css = (ROOT / "assets/css/core-post-navigation.css").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertIn("'core/post-navigation-link'", functions)
        self.assertIn("'slateframe-core-post-navigation'", functions)
        self.assertIn("'assets/css/core-post-navigation.css'", functions)
        self.assertIn(
            "'path'   => get_template_directory() . '/assets/css/core-post-navigation.css'",
            functions,
        )
        self.assertIn("assets/css/core-post-navigation.css", workflow)
        self.assertIn(
            'test $(wc -c < assets/css/core-post-navigation.css) -le 550', workflow
        )
        self.assertLessEqual(len(css.encode()), 550)
        self.assertIn(".wp-block-post-navigation-link a", css)
        self.assertIn("min-block-size:var(--slateframe-control)", css)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertNotIn("!important", css)
        self.assertNotIn("get_previous_post(", functions)
        self.assertNotIn("get_next_post(", functions)

    def test_browser_and_editor_acceptance_are_real(self):
        spec = (ROOT / "tests/browser/core-post-navigation-parity.spec.js").read_text()
        for value in (
            "320", "375", "390", "412", "768", "1440", "1920",
            "'ltr'", "'rtl'", "[16, 32, 64]", "forcedColors",
            "AxeBuilder", "openAuthenticatedEditor", "get_permalink",
            "post_date", "'--force'", "toBeFocused",
            "core-post-navigation-390-rtl-200-forced-colors.png",
            "core/post-navigation-link", "showTitle", "type",
        ):
            self.assertIn(value, spec)
        for forbidden in ("route.fulfill", "test.fixme", "test.only"):
            self.assertNotIn(forbidden, spec)


if __name__ == "__main__":
    unittest.main()
