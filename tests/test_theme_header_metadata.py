"""Regression for WordPress Core's first-8-KB style.css metadata parser."""
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_TAGS = (
    "blog,photography,portfolio,one-column,custom-logo,custom-menu,"
    "featured-images,translation-ready,rtl-language-support,block-styles,wide-blocks"
)


class ThemeHeaderMetadata(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.style = (ROOT / "style.css").read_text(encoding="utf-8")
        cls.validator = (ROOT / "bin/check-release-metadata.php").read_text(encoding="utf-8")

    def test_core_style_header_tags_do_not_include_minified_css(self):
        # get_file_data() only examines the first 8 KB and matches metadata by line.
        header_window = self.style[:8192]
        match = re.search(r"^[ \t\/*#@]*Tags:(.*)$", header_window, re.MULTILINE)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1).strip(), EXPECTED_TAGS)
        self.assertNotIn("--slateframe-", match.group(1))
        self.assertLess(len(match.group(1)), 256)

    def test_css_comment_closes_after_complete_tags_line(self):
        self.assertTrue(self.style.startswith("/*\nTheme Name: Slateframe\n"))
        self.assertIn("Tags: " + EXPECTED_TAGS + "\n*/\n:root{", self.style)
        self.assertEqual(self.style.count("*/", 0, self.style.index(":root{")), 1)
        self.assertTrue(self.style[self.style.index(":root{"):].startswith(":root{"))

    def test_release_validator_guards_wordpress_tags_contract(self):
        self.assertIn("slateframe_release_field( $style, 'Tags' )", self.validator)
        self.assertIn("Theme Tags must be comma-separated slugs", self.validator)
        self.assertIn("preg_match", self.validator)

    def test_no_site_specific_tokens_in_public_header(self):
        header = self.style[:self.style.index("*/")]
        self.assertNotIn("time2log", header.lower())
        self.assertNotIn("license key", header.lower())
        self.assertIn("Text Domain: slateframe", header)


    def _run_release_validator(self, style):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "bin").mkdir()
            (root / "style.css").write_text(style, encoding="utf-8")
            (root / "bin/check-release-metadata.php").write_text(self.validator, encoding="utf-8")
            for name in ("readme.txt", "package.json"):
                shutil.copyfile(ROOT / name, root / name)
            return subprocess.run(
                ["php", str(root / "bin/check-release-metadata.php")],
                text=True, capture_output=True, check=False,
            )

    def test_actual_php_release_validator_accepts_clean_header(self):
        result = self._run_release_validator(self.style)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("release metadata OK", result.stdout)

    def test_actual_php_release_validator_rejects_css_in_tags(self):
        corrupt = self.style.replace("wide-blocks\n*/\n:root{", "wide-blocks*/:root{", 1)
        result = self._run_release_validator(corrupt)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Theme Tags must be comma-separated slugs", result.stderr)

    def test_actual_php_release_validator_rejects_non_slug_tag(self):
        corrupt = self.style.replace("wide-blocks\n*/", "wide-blocks,untrusted{css}\n*/", 1)
        result = self._run_release_validator(corrupt)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Theme Tags must be comma-separated slugs", result.stderr)

    def test_actual_php_release_validator_rejects_header_beyond_core_limit(self):
        corrupt = self.style.replace("Theme Name: Slateframe\n", "Theme Name: Slateframe\n" + (" " * 8200), 1)
        result = self._run_release_validator(corrupt)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("first 8 KB", result.stderr)


if __name__ == "__main__":
    unittest.main()
