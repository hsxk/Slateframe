"""Safe offline visual review output must never redirect writes through links."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "bin/visual-review-index.py"
SPEC = importlib.util.spec_from_file_location("slateframe_safe_visual_review", MODULE)
review = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review)


class SafeReviewOutput(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.evidence = self.root / "screenshots"
        self.evidence.mkdir()
        self.output = self.root / "browser-review.html"

    def test_creates_and_atomically_replaces_ordinary_html(self):
        review.write_review_index(self.evidence, self.output, "<html>first</html>")
        self.assertEqual(self.output.read_text(), "<html>first</html>")
        review.write_review_index(self.evidence, self.output, "<html>second</html>")
        self.assertEqual(self.output.read_text(), "<html>second</html>")
        self.assertEqual(list(self.root.glob(".slateframe-review-*.tmp")), [])

    def test_existing_symlink_cannot_overwrite_target(self):
        protected = self.root / "protected.txt"
        protected.write_text("unchanged")
        self.output.symlink_to(protected)
        with self.assertRaisesRegex(ValueError, "unsafe review output"):
            review.write_review_index(self.evidence, self.output, "attack")
        self.assertEqual(protected.read_text(), "unchanged")
        self.assertTrue(self.output.is_symlink())

    def test_dangling_symlink_is_rejected(self):
        self.output.symlink_to(self.root / "missing.txt")
        with self.assertRaisesRegex(ValueError, "unsafe review output"):
            review.write_review_index(self.evidence, self.output, "attack")
        self.assertFalse((self.root / "missing.txt").exists())

    def test_existing_hardlink_cannot_replace_other_file(self):
        protected = self.root / "protected.txt"
        protected.write_text("unchanged")
        self.output.hardlink_to(protected)
        with self.assertRaisesRegex(ValueError, "unsafe review output"):
            review.write_review_index(self.evidence, self.output, "attack")
        self.assertEqual(protected.read_text(), "unchanged")

    def test_directory_output_is_rejected(self):
        self.output.mkdir()
        with self.assertRaisesRegex(ValueError, "unsafe review output"):
            review.write_review_index(self.evidence, self.output, "attack")
        self.assertTrue(self.output.is_dir())

    def test_cannot_write_inside_evidence_directory(self):
        with self.assertRaisesRegex(ValueError, "outside verified screenshot directory"):
            review.write_review_index(self.evidence, self.evidence / "review.html", "attack")
        self.assertFalse((self.evidence / "review.html").exists())

    def test_symlinked_output_parent_is_rejected(self):
        alias = self.root / "alias"
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "linked review output directory"):
            review.write_review_index(self.evidence, alias / "review.html", "attack")
        self.assertFalse((self.root / "review.html").exists())

    def test_symlinked_parent_into_evidence_is_rejected(self):
        alias = self.root / "alias"
        alias.symlink_to(self.evidence, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "outside verified screenshot directory"):
            review.write_review_index(self.evidence, alias / "review.html", "attack")
        self.assertFalse((self.evidence / "review.html").exists())

    def test_both_clis_share_atomic_writer(self):
        browser = MODULE.read_text(encoding="utf-8")
        photo = (ROOT / "bin/photography-review-index.py").read_text(encoding="utf-8")
        self.assertIn("write_review_index(args.screenshots, output, render(", browser)
        self.assertIn("review.write_review_index(args.screenshots, output, review.render(", photo)

    def test_failure_does_not_leave_temporary_files(self):
        self.output.symlink_to(self.root / "missing.txt")
        with self.assertRaises(ValueError):
            review.write_review_index(self.evidence, self.output, "attack")
        self.assertEqual(list(self.root.glob(".slateframe-review-*.tmp")), [])


if __name__ == "__main__":
    unittest.main()
