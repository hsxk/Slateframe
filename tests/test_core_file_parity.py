"""Core File remains native, accessible, and conditionally styled."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreFileParity(unittest.TestCase):
    def test_conditional_editor_shared_asset(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-file.css").read_text(encoding="utf-8")
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in (
            "function slateframe_register_core_file_styles()",
            "'core/file',",
            "'handle' => 'slateframe-core-file'",
            "'assets/css/core-file.css'",
            "add_action( 'init', 'slateframe_register_core_file_styles', 20 );",
        ):
            self.assertIn(token, php)
        self.assertIn("'assets/css/core-file.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for token in (
            ".wp-block-file", ".wp-block-file>a", ".wp-block-file__button",
            "min-inline-size:0", "max-inline-size:100%", "display:inline-flex",
            "min-block-size:var(--slateframe-control)", "overflow-wrap:anywhere",
        ):
            self.assertIn(token, css)
        self.assertIn(".wp-block-file__embed{max-inline-size:100%}", css)
        self.assertLessEqual(len(css.encode("utf-8")), 400)
        self.assertIn("test $(wc -c < assets/css/core-file.css) -le 400", ci)
        self.assertIn("grep -qx 'slateframe/assets/css/core-file.css' /tmp/package.txt", ci)
        for forbidden in ("!important", "display:none", "time2log_", "wpcode_",
                          "javascript", "direction:ltr"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/file", php)

    def test_preview_fixture_does_not_mask_theme_containment(self):
        preview = (ROOT / "tests/browser/core-file-preview.spec.js").read_text(
            encoding="utf-8"
        )
        self.assertIn("inline-size:600px", preview)
        self.assertNotIn("max-inline-size:100%;block-size", preview)
        for token in (
            "sizes.preview.width", "sizes.preview.right",
            "sizes.preview.maxInlineSize", "sizes.container + 1",
            "core-file-preview-390-rtl-400-forced-colors.png",
        ):
            with self.subTest(token=token):
                self.assertIn(token, preview)

    def test_disposable_wordpress_and_editor_coverage(self):
        js = (ROOT / "tests/browser/core-file-parity.spec.js").read_text(encoding="utf-8")
        for token in (
            "wp('post', 'create'", "wp('post', 'delete'", "finally",
            "wp:file", "--post_type=page", "get_template_directory_uri()",
            "toHaveAttribute('download'", "response.ok()",
            "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
            "[16, 32, 64]", "fontSize = '64px'", "forcedColors: 'active'",
            "AxeBuilder", "openAuthenticatedEditor", "blocks.serialize",
            "blocks.parse", "page.keyboard.press('Tab')",
            "core-file-390-rtl-200-forced-colors.png",
            "core-file-preview-390-", "native PDF preview width",
            "native PDF preview right", "object.wp-block-file__embed",
            "Core-hidden PDF preview", "hidden: node.hidden",
            "page.goto('/?p=999999999'",
        ):
            self.assertIn(token, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill",
                          "set_theme_mod(", "wp('option', 'update'"):
            self.assertNotIn(forbidden, js)


if __name__ == "__main__":
    unittest.main()
