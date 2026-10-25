"""Native Core Tag Cloud presentation, distribution, and browser evidence contract."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreTagCloudParity(unittest.TestCase):
    def test_conditional_block_asset_and_editor_parity(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-tag-cloud.css").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for needle in (
            "function slateframe_register_core_tag_cloud_styles()",
            "'core/tag-cloud',",
            "'handle' => 'slateframe-core-tag-cloud'",
            "'assets/css/core-tag-cloud.css'",
            "add_action( 'init', 'slateframe_register_core_tag_cloud_styles', 20 );",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, php)
        for needle in (
            ".wp-block-tag-cloud", ".wp-block-tag-cloud a",
            "min-inline-size:0", "max-inline-size:100%",
            "min-inline-size:min(100%,var(--slateframe-control))",
            "min-block-size:var(--slateframe-control)",
            "overflow-wrap:anywhere",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, css)
        self.assertIn("assets/css/core-tag-cloud.css", workflow)
        self.assertIn("test $(wc -c < assets/css/core-tag-cloud.css) -le 400", workflow)
        self.assertLessEqual(len(css.encode("utf-8")), 400)
        for forbidden in ("!important", "javascript", "time2log_", "wpcode_", "direction:ltr", "font-size:"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/tag-cloud", php)

    def test_native_wordpress_browser_evidence(self):
        js = (ROOT / "tests/browser/core-tag-cloud-parity.spec.js").read_text(encoding="utf-8")
        for needle in (
            "wp('term', 'create'", "wp('post', 'create'", "wp('post', 'delete'",
            "wp('term', 'delete'", "finally", "get_tag_link(",
            "tag-cloud-link", "get_category_link(", "tag-link-count",
            "new Set(sizes.filter(Boolean)).size",
            "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
            "forcedColors: 'active'", "new AxeBuilder",
            "core-tag-cloud-390-rtl-200-forced-colors.png",
            "openAuthenticatedEditor", "blocks.serialize", "blocks.parse",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)


if __name__ == "__main__":
    unittest.main()
